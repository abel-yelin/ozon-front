import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getUserGalleryImages } from '@/shared/services/gallery';

// GET - List user gallery images from completed tasks
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '200', 10);
    const taskLimitParam = Number.parseInt(
      searchParams.get('task_limit') || '50',
      10
    );

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 500)
      : 200;
    const taskLimit = Number.isFinite(taskLimitParam)
      ? Math.min(Math.max(taskLimitParam, 1), 200)
      : 50;

    const images = await getUserGalleryImages(user.id, { limit, taskLimit });

    return respData({ images, total: images.length });
  } catch (error) {
    console.error('Get gallery error:', error);
    return respErr('Failed to load gallery');
  }
}
