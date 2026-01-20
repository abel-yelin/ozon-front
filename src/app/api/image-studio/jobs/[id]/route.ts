import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

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

    const cfg = (job.config || {}) as Record<string, any>;
    return respData({
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
      result: job.resultImageUrls || null,
    });
  } catch (error) {
    console.error('Get ImageStudio job error:', error);
    return respErr('Failed to load job');
  }
}
