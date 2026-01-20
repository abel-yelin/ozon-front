import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getFileNameFromUrl, getStemFromFilename, isMainStem } from '@/shared/lib/image-studio';
import { getUserGalleryImages } from '@/shared/services/gallery';

// GET /api/image-studio/folders/[sku]/pairs
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { sku } = await params;
    const skuName = decodeURIComponent(String(sku || '').trim());
    if (!skuName) {
      return respErr('sku required');
    }

    const galleryImages = await getUserGalleryImages(user.id, { limit: 500 });
    const skuImages = galleryImages.filter((image) => image.article === skuName);
    if (!skuImages.length) {
      return respData({ sku: skuName, pairs: [] });
    }

    let state = await aiPlaygroundDb.getWorkflowStateByName(user.id, skuName);
    if (!state) {
      state = await aiPlaygroundDb.createWorkflowState({
        userId: user.id,
        name: skuName,
        state: 'pending',
        imagePairs: [],
        config: {},
      });
    }

    const pairs = await aiPlaygroundDb.getUserImagePairs(user.id, {
      workflowStateId: state.id,
      limit: 10000,
    });
    const pairBySource = new Map(pairs.map((pair) => [pair.sourceUrl, pair]));

    const formatted = skuImages.map((image) => {
      const inputName = getFileNameFromUrl(image.url);
      const stem = getStemFromFilename(inputName);
      const isMain = isMainStem(stem);
      const existing = pairBySource.get(image.url);
      const outputName = getFileNameFromUrl(existing?.resultUrl);
      return {
        stem: stem || getStemFromFilename(outputName),
        is_main: isMain,
        input_url: image.url,
        output_url: existing?.resultUrl || null,
        input_name: inputName,
        output_name: outputName,
        pair_id: existing?.id || stem || image.url,
      };
    });

    return respData({ sku: skuName, pairs: formatted });
  } catch (error) {
    console.error('Get ImageStudio pairs error:', error);
    return respErr('Failed to load pairs');
  }
}
