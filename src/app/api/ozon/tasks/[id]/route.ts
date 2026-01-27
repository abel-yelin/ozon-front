import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';
import { z } from 'zod';

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

      // Store in result field as browserUploadResults
      updateData.result = {
        ...existingTask.result,
        browserUploadResults: results,
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
