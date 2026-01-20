import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { syncImageStudioJob } from '@/app/api/image-studio/jobs/helpers';

// GET /api/image-studio/jobs/[id]
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
    const job = await aiPlaygroundDb.getJob(id, user.id);
    if (!job) {
      return respErr('Job not found');
    }

    const synced = await syncImageStudioJob(user.id, job);
    const cfg = (synced.config || {}) as Record<string, any>;
    return respData({
      id: synced.id,
      mode: cfg.mode || job.type,
      sku: cfg.sku || '',
      stem: cfg.stem || null,
      status: synced.status,
      cancel_requested: synced.status === 'cancelled',
      created_at: synced.createdAt,
      started_at: synced.startedAt,
      finished_at: synced.completedAt,
      error: synced.errorMessage || null,
      result: synced.resultImageUrls || null,
    });
  } catch (error) {
    console.error('Get ImageStudio job error:', error);
    return respErr('Failed to load job');
  }
}
