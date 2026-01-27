import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';
import { decryptCredential } from '@/lib/crypto';
import { ozonApi } from '@/lib/api/ozon';
import { z } from 'zod';

const createTaskSchema = z.object({
  credentialId: z.string().min(1, 'Credential ID is required'),
  articles: z
    .array(z.string())
    .min(1, 'At least one article is required')
    .max(100, 'Maximum 100 articles per batch'),
  field: z.enum(['offer_id', 'sku', 'vendor_code']).default('offer_id'),
  useBrowserUpload: z.boolean().optional().default(false),
});

// GET - Get user's task list
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const tasks = await ozonDb.getUserTasks(user.id, { status, limit });

    return respData(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return respErr('Failed to get tasks');
  }
}

// POST - Create and execute new download task
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = createTaskSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const { credentialId, articles, field, useBrowserUpload } = validatedData.data;

    // 1. Get credential from database
    const credentialRecord = await ozonDb.getCredential(
      credentialId,
      user.id
    );

    if (!credentialRecord) {
      return respErr('Credential not found');
    }

    // 2. Decrypt credential
    const credential = decryptCredential(credentialRecord.encryptedData);

    // 3. Create task record
    const task = await ozonDb.createTask({
      userId: user.id,
      credentialId,
      articles,
      field,
    });

    // 4. For browser upload mode, get image URLs only and return immediately
    if (useBrowserUpload) {
      try {
        // Call Ozon API to get product info and image URLs (no download)
        const imageUrls = await ozonApi.getImageUrls({
          credential,
          articles,
          field,
          user_id: user.id,
        });

        // Update task with image URLs for browser to process
        await ozonDb.updateTask(task.id, user.id, {
          status: 'pending_browser_upload',
          progress: 0,
          result: imageUrls,
        });

        // Return task with image URLs
        return respData({
          ...task,
          status: 'pending_browser_upload',
          result: imageUrls,
          useBrowserUpload: true,
        });
      } catch (error) {
        console.error('Failed to get image URLs:', error);

        // Check if backend doesn't support download_images parameter
        const errorMsg = error instanceof Error ? error.message : 'Failed to get image URLs';
        if (errorMsg.includes('NO_IMAGES_DOWNLOADED') || errorMsg.includes('download_images')) {
          await ozonDb.updateTask(task.id, user.id, {
            status: 'failed',
            errorMessage: 'Browser upload mode is not supported by the Python backend yet. Please update the backend to support the `download_images` parameter, or use server download mode instead.',
            completedAt: new Date(),
          });
          return respErr('Browser upload mode requires Python backend update. The backend needs to support the `download_images=false` parameter to return image URLs without downloading them. Please use server download mode or update your Python backend.');
        }

        await ozonDb.updateTask(task.id, user.id, {
          status: 'failed',
          errorMessage: errorMsg,
          completedAt: new Date(),
        });
        return respErr(`Failed to get image URLs: ${errorMsg}`);
      }
    }

    // 5. For server download mode, update task status to processing
    await ozonDb.updateTask(task.id, user.id, {
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
    });

    // 6. Call backend API (non-blocking)
    ozonApi
      .downloadImages({
        credential,
        articles,
        field,
        user_id: user.id,
      })
      .then(async (response) => {
        const resultUpdate = response.data
          ? {
              result: response.data,
              totalArticles: response.data.total_articles,
              processedArticles: response.data.processed,
              totalImages: response.data.total_images,
              successImages: response.data.success_images,
              failedImages: response.data.failed_images,
            }
          : {};

        if (response.success && response.data) {
          // Save successful result
          await ozonDb.updateTask(task.id, user.id, {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            ...resultUpdate,
          });
          return;
        }

        // Save error (include any partial result for debugging)
        await ozonDb.updateTask(task.id, user.id, {
          status: 'failed',
          errorMessage: response.error || 'Download failed',
          completedAt: new Date(),
          ...resultUpdate,
        });
      })
      .catch(async (error) => {
        console.error('Download task error:', error);
        await ozonDb.updateTask(task.id, user.id, {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        });
      });

    // Return task immediately (async processing)
    return respData(task);
  } catch (error) {
    console.error('Create task error:', error);
    return respErr('Failed to create task');
  }
}
