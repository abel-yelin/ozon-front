import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { aiPlaygroundApi } from '@/lib/api/ai-playground';
import { z } from 'zod';

const createJobSchema = z.object({
  type: z.enum(['background_replacement', 'batch_optimization', 'image_enhancement']),
  config: z.record(z.string(), z.unknown()),
  sourceImageUrls: z.array(z.string()).min(1, 'At least one image is required'),
});

// GET - Get user's AI jobs
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const jobs = await aiPlaygroundDb.getUserJobs(user.id, { status, type, limit });

    return respData(jobs);
  } catch (error) {
    console.error('Get AI jobs error:', error);
    return respErr('Failed to get jobs');
  }
}

// POST - Create and submit new AI job
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = createJobSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const { type, config, sourceImageUrls } = validatedData.data;

    if (type === 'background_replacement') {
      const backgroundPrompt = (config as { backgroundPrompt?: string }).backgroundPrompt;
      if (!backgroundPrompt || !backgroundPrompt.trim()) {
        return respErr('backgroundPrompt is required for background replacement');
      }
    }

    // 1. Create job record
    const job = await aiPlaygroundDb.createJob({
      userId: user.id,
      type,
      config,
      sourceImageUrls,
    });

    // 2. Update job status to processing
    await aiPlaygroundDb.updateJob(job.id, user.id, {
      status: 'processing',
      startedAt: new Date(),
    });

    // 3. Submit to Python backend (non-blocking)
    aiPlaygroundApi
      .submitJob({
        job_id: job.id,
        user_id: user.id,
        type,
        config: config as any,
        source_image_urls: sourceImageUrls,
      })
      .then(async (response) => {
        if (response.success && response.data) {
          // Save successful result
          await aiPlaygroundDb.updateJob(job.id, user.id, {
            status: 'completed',
            progress: 100,
            resultImageUrls: response.data.result_image_urls,
            completedAt: new Date(),
          });

          // Create image pairs for review
          for (let i = 0; i < response.data.source_image_urls.length; i++) {
            await aiPlaygroundDb.createImagePair({
              userId: user.id,
              jobId: job.id,
              sourceUrl: response.data.source_image_urls[i],
              resultUrl: response.data.result_image_urls[i],
              approved: false,
              metadata: response.data.metadata[i] || {},
            });
          }

          // Create log entry
          await aiPlaygroundDb.createJobLog({
            jobId: job.id,
            level: 'info',
            message: `Job completed successfully. Processed ${response.data.source_image_urls.length} images.`,
          });

          return;
        }

        // Save error
        await aiPlaygroundDb.updateJob(job.id, user.id, {
          status: 'failed',
          errorMessage: response.error || 'Job failed',
          completedAt: new Date(),
        });

        await aiPlaygroundDb.createJobLog({
          jobId: job.id,
          level: 'error',
          message: response.error || 'Job failed',
        });
      })
      .catch(async (error) => {
        console.error('AI job error:', error);
        await aiPlaygroundDb.updateJob(job.id, user.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        });

        await aiPlaygroundDb.createJobLog({
          jobId: job.id,
          level: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    // Return job immediately (async processing)
    return respData(job);
  } catch (error) {
    console.error('Create AI job error:', error);
    return respErr('Failed to create job');
  }
}
