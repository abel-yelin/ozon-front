import { ozonDb } from '@/lib/db/ozon';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

export type GalleryImage = {
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

function getAiGalleryArticle(metadata: unknown) {
  const parsed = parseJson(metadata) as { uploadedAt?: string } | null;
  const uploadedAt = parsed?.uploadedAt;
  if (uploadedAt) {
    const date = new Date(uploadedAt);
    if (!Number.isNaN(date.getTime())) {
      return `AI Playground ${date.toISOString().slice(0, 10)}`;
    }
  }
  return 'AI Playground';
}

export async function getUserGalleryImages(
  userId: string,
  options?: { limit?: number; taskLimit?: number }
) {
  const limitParam = options?.limit ?? 200;
  const taskLimitParam = options?.taskLimit ?? 50;
  const limit = Math.min(Math.max(limitParam, 1), 500);
  const taskLimit = Math.min(Math.max(taskLimitParam, 1), 200);

  const tasks = await ozonDb.getUserTasks(userId, {
    status: 'completed',
    limit: taskLimit,
  });

  const images: GalleryImage[] = [];
  const seen = new Set<string>();

  const pushImage = (image: GalleryImage) => {
    if (images.length >= limit) {
      return false;
    }
    images.push(image);
    return true;
  };

  let reachedLimit = false;

  for (const task of tasks) {
    const result = parseJson((task as any).result);
    const items = Array.isArray(result?.items) ? result.items : [];

    for (const item of items) {
      const urls = Array.isArray(item?.urls) ? item.urls : [];
      const article = typeof item?.article === 'string' ? item.article : 'unknown';

      for (const url of urls) {
        if (!url || typeof url !== 'string') continue;
        if (seen.has(url)) continue;

        seen.add(url);
        const keepGoing = pushImage({
          url,
          article,
          taskId: (task as any).id,
          createdAt: (task as any).createdAt?.toString?.() || '',
        });

        if (!keepGoing) {
          reachedLimit = true;
          break;
        }
      }

      if (reachedLimit) break;
    }

    if (reachedLimit) break;
  }

  if (!reachedLimit && images.length < limit) {
    const remaining = limit - images.length;
    const aiPairs = await aiPlaygroundDb.getUserImagePairs(userId, {
      limit: Math.min(remaining * 2, 500),
    });

    for (const pair of aiPairs) {
      const sourceUrl = (pair as any).sourceUrl;
      const resultUrl = (pair as any).resultUrl;
      const metadata = (pair as any).metadata;
      const parsedMetadata = parseJson(metadata) as { status?: string } | null;

      if (!sourceUrl || typeof sourceUrl !== 'string') continue;
      if (seen.has(sourceUrl)) continue;
      if (resultUrl) continue;

      if (parsedMetadata?.status && parsedMetadata.status !== 'uploaded') {
        continue;
      }

      seen.add(sourceUrl);
      const keepGoing = pushImage({
        url: sourceUrl,
        article: getAiGalleryArticle(metadata),
        taskId: (pair as any).id,
        createdAt: (pair as any).createdAt?.toString?.() || '',
      });

      if (!keepGoing) {
        break;
      }
    }
  }

  return images;
}
