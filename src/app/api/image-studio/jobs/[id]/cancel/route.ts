import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { cancelImageStudioJob } from '@/lib/api/image-studio-server';

// POST /api/image-studio/jobs/[id]/cancel
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const job = await aiPlaygroundDb.getJob(id, user.id);
    if (!job) {
      return respErr('Job not found');
    }

    const ok = await cancelImageStudioJob(id);
    if (ok) {
      await aiPlaygroundDb.updateJob(id, user.id, {
        status: 'cancelled',
        completedAt: new Date(),
      });
    }

    return respData({ ok });
  } catch (error) {
    console.error('Cancel ImageStudio job error:', error);
    return respErr('Failed to cancel job');
  }
}
