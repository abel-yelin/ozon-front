import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';
import { z } from 'zod';

function parseJson(value: unknown) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

const updateTaskSchema = z.object({
  status: z.enum(['processing', 'completed', 'failed', 'pending_browser_upload', 'partial_success']).optional(),
  result: z.any().optional(),
  browserUploadResults: z.array(z.object({
    ozonUrl: z.string(),
    publicUrl: z.string(),
    success: z.boolean(),
  })).optional(),
});

// GET - Get single task details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const task = await ozonDb.getTask(id, user.id);

    if (!task) {
      return respErr('Task not found');
    }

    return respData(task);
  } catch (error) {
    console.error('Get task error:', error);
    return respErr('Failed to get task');
  }
}

// PATCH - Update task (for browser upload completion)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const body = await req.json();

    // Validate input
    const validatedData = updateTaskSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // Check if task exists
    const existingTask = await ozonDb.getTask(id, user.id);
    if (!existingTask) {
      return respErr('Task not found');
    }

    // Calculate statistics from browser upload results
    let updateData: any = {};
    if (validatedData.data.status) {
      updateData.status = validatedData.data.status;
    }

    if (validatedData.data.browserUploadResults) {
      const results = validatedData.data.browserUploadResults;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      // Create mapping from Ozon URL to R2 URL
      const urlMapping = new Map<string, string>();
      for (const result of results) {
        if (result.success && result.ozonUrl && result.publicUrl) {
          urlMapping.set(result.ozonUrl, result.publicUrl);
          console.log('[Ozon Task] URL mapping:', result.ozonUrl, '->', result.publicUrl);
        }
      }

      // Parse existing result
      const existingResult = parseJson(existingTask.result) || { items: [] };

      // Update task.result.items with R2 URLs
      const updatedItems = (existingResult.items || []).map((item: any) => {
        if (!item.urls || !Array.isArray(item.urls)) {
          return item;
        }

        // Replace Ozon URLs with R2 URLs
        const updatedUrls = item.urls.map((url: string) => {
          const r2Url = urlMapping.get(url);
          if (r2Url) {
            console.log('[Ozon Task] Replacing URL:', url, '->', r2Url);
            return r2Url;
          }
          return url;
        });

        return {
          ...item,
          urls: updatedUrls,
        };
      });

      console.log('[Ozon Task] Updated', updatedItems.length, 'items with R2 URLs');

      // Store updated result with R2 URLs
      updateData.result = {
        ...existingResult,
        items: updatedItems,
        browserUploadResults: results, // Keep original results for debugging
      };
      updateData.successImages = successCount;
      updateData.failedImages = failCount;
      updateData.totalImages = results.length;
      updateData.completedAt = new Date();
    }

    // Update task
    await ozonDb.updateTask(id, user.id, updateData);

    // Return updated task
    const updatedTask = await ozonDb.getTask(id, user.id);
    return respData(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return respErr('Failed to update task');
  }
}

// DELETE - Delete task
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    await ozonDb.deleteTask(id, user.id);

    return respData({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return respErr('Failed to delete task');
  }
}
