import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { submitImageStudioJob } from '@/lib/api/image-studio-server';

function buildJobView(job: any) {
  const cfg = (job.config || {}) as Record<string, any>;
  return {
    id: job.id,
    mode: cfg.mode || job.type,
    sku: cfg.sku || '',
    stem: cfg.stem || null,
    status: job.status,
    cancel_requested: job.status === 'cancelled',
    created_at: job.createdAt,
    started_at: job.startedAt,
    finished_at: job.completedAt,
    error: job.errorMessage || null,
  };
}

// GET /api/image-studio/jobs
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const jobs = await aiPlaygroundDb.getUserJobs(user.id, {
      limit,
      type: 'image_studio',
    });
    const jobViews = jobs.map(buildJobView);
    const runningJobs = jobViews.filter((j) => j.status === 'processing');
    const running = runningJobs.length ? runningJobs[0] : null;
    const queuedCount = jobViews.filter((j) => j.status === 'pending').length;

    return respData({
      running,
      running_jobs: runningJobs,
      queued_count: queuedCount,
      jobs: jobViews,
    });
  } catch (error) {
    console.error('Get ImageStudio jobs error:', error);
    return respErr('Failed to load jobs');
  }
}

// POST /api/image-studio/jobs
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const mode = String(body?.mode || '').trim();
    const sku = String(body?.sku || '').trim();
    const stem = body?.stem ? String(body.stem).trim() : '';
    const options = body?.options || {};

    if (!mode || !sku) {
      return respErr('mode/sku required');
    }

    let workflowState = await aiPlaygroundDb.getWorkflowStateByName(user.id, sku);
    if (!workflowState) {
      workflowState = await aiPlaygroundDb.createWorkflowState({
        userId: user.id,
        name: sku,
        state: 'pending',
        imagePairs: [],
        config: { mode },
      });
    }

    const job = await aiPlaygroundDb.createJob({
      userId: user.id,
      type: 'image_studio',
      config: { mode, sku, stem, options, workflowStateId: workflowState.id },
      sourceImageUrls: [],
    });

    await aiPlaygroundDb.updateJob(job.id, user.id, {
      status: 'processing',
      startedAt: new Date(),
    });

    submitImageStudioJob({
      job_id: job.id,
      user_id: user.id,
      mode,
      sku,
      stem: stem || null,
      options,
      workflow_state_id: workflowState.id,
    })
      .then(async (response: any) => {
        if (!response || response.success === false) {
          await aiPlaygroundDb.updateJob(job.id, user.id, {
            status: 'failed',
            errorMessage: response?.error || 'Job failed',
            completedAt: new Date(),
          });
          await aiPlaygroundDb.createJobLog({
            jobId: job.id,
            level: 'error',
            message: response?.error || 'Job failed',
          });
          return;
        }

        await aiPlaygroundDb.updateJob(job.id, user.id, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        });

        const items: any[] = response?.data?.items || response?.items || [];
        if (items.length) {
          const existingPairs = await aiPlaygroundDb.getUserImagePairs(user.id, {
            workflowStateId: workflowState.id,
            limit: 10000,
          });
          const bySource = new Map(existingPairs.map((p) => [p.sourceUrl, p]));
          for (const item of items) {
            const sourceUrl = item.source_url || item.sourceUrl;
            const resultUrl = item.result_url || item.resultUrl;
            if (!sourceUrl) continue;
            const existing = bySource.get(sourceUrl);
            if (existing) {
              await aiPlaygroundDb.updateImagePair(existing.id, user.id, {
                resultUrl: resultUrl || existing.resultUrl || null,
                metadata: item.metadata || existing.metadata || undefined,
              });
            } else {
              await aiPlaygroundDb.createImagePair({
                userId: user.id,
                workflowStateId: workflowState.id,
                jobId: job.id,
                sourceUrl,
                resultUrl,
                metadata: item.metadata || undefined,
              });
            }
          }
        }

        await aiPlaygroundDb.createJobLog({
          jobId: job.id,
          level: 'info',
          message: 'Job completed successfully.',
        });
      })
      .catch(async (error: any) => {
        console.error('ImageStudio job failed:', error);
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

    return respData({ job_id: job.id });
  } catch (error) {
    console.error('Create ImageStudio job error:', error);
    return respErr('Failed to create job');
  }
}
