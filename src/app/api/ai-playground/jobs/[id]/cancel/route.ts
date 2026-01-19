import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { aiPlaygroundApi } from '@/lib/api/ai-playground';

// POST - Cancel AI job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id: jobId } = await params;

    // Check if job exists and belongs to user
    const job = await aiPlaygroundDb.getJob(jobId, user.id);
    if (!job) {
      return respErr('Job not found');
    }

    // Only allow canceling pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return respErr('Can only cancel pending or processing jobs');
    }

    // Cancel via Python backend
    const canceled = await aiPlaygroundApi.cancelJob(jobId);

    if (canceled) {
      // Update job status
      await aiPlaygroundDb.updateJob(jobId, user.id, {
        status: 'failed',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      });

      return respData({ success: true });
    }

    return respErr('Failed to cancel job');
  } catch (error) {
    console.error('Cancel AI job error:', error);
    return respErr('Failed to cancel job');
  }
}
