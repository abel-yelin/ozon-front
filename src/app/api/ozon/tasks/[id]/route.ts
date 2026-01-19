import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

// GET - Get single task details
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const task = await ozonDb.getTask(params.id, user.id);

    if (!task) {
      return respErr('Task not found');
    }

    return respData(task);
  } catch (error) {
    console.error('Get task error:', error);
    return respErr('Failed to get task');
  }
}

// DELETE - Delete task
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    await ozonDb.deleteTask(params.id, user.id);

    return respData({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return respErr('Failed to delete task');
  }
}
