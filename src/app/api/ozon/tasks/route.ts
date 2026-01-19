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

    const { credentialId, articles, field } = validatedData.data;

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

    // 4. Update task status to processing
    await ozonDb.updateTask(task.id, user.id, {
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
    });

    // 5. Call backend API (non-blocking)
    ozonApi
      .downloadImages({
        credential,
        articles,
        field,
        user_id: user.id,
      })
      .then(async (response) => {
        if (response.success && response.data) {
          // Save successful result
          await ozonDb.updateTask(task.id, user.id, {
            status: 'completed',
            progress: 100,
            result: response.data,
            totalArticles: response.data.total_articles,
            processedArticles: response.data.processed,
            totalImages: response.data.total_images,
            successImages: response.data.success_images,
            failedImages: response.data.failed_images,
            completedAt: new Date(),
          });
        } else {
          // Save error
          await ozonDb.updateTask(task.id, user.id, {
            status: 'failed',
            errorMessage: response.error || 'Download failed',
            completedAt: new Date(),
          });
        }
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
