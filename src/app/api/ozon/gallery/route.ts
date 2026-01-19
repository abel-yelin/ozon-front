import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

type GalleryImage = {
  url: string;
  article: string;
  taskId: string;
  createdAt: string;
};

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

    const tasks = await ozonDb.getUserTasks(user.id, {
      status: 'completed',
      limit: taskLimit,
    });

    const images: GalleryImage[] = [];
    const seen = new Set<string>();

    for (const task of tasks) {
      const result = parseJson((task as any).result);
      const items = Array.isArray(result?.items) ? result.items : [];

      for (const item of items) {
        const urls = Array.isArray(item?.urls) ? item.urls : [];
        const article =
          typeof item?.article === 'string' ? item.article : 'unknown';

        for (const url of urls) {
          if (!url || typeof url !== 'string') continue;
          if (seen.has(url)) continue;

          seen.add(url);
          images.push({
            url,
            article,
            taskId: (task as any).id,
            createdAt: (task as any).createdAt?.toString?.() || '',
          });

          if (images.length >= limit) {
            return respData({ images, total: images.length });
          }
        }
      }
    }

    return respData({ images, total: images.length });
  } catch (error) {
    console.error('Get gallery error:', error);
    return respErr('Failed to load gallery');
  }
}
