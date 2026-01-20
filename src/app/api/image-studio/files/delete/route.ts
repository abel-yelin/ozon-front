import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getFileNameFromUrl, getStemFromFilename } from '@/shared/lib/image-studio';

// POST /api/image-studio/files/delete
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const sku = String(body?.sku || '').trim();
    const stem = String(body?.stem || '').trim();
    const location = String(body?.location || '').toLowerCase();

    if (!sku || !stem) {
      return respErr('sku/stem required');
    }
    if (location !== 'input' && location !== 'output') {
      return respErr('location must be input or output');
    }

    const state = await aiPlaygroundDb.getWorkflowStateByName(user.id, sku);
    if (!state) {
      return respErr('SKU not found');
    }

    const pairs = await aiPlaygroundDb.getUserImagePairs(user.id, {
      workflowStateId: state.id,
      limit: 10000,
    });

    const target = pairs.find((pair) => {
      const inputName = getFileNameFromUrl(pair.sourceUrl);
      const outputName = getFileNameFromUrl(pair.resultUrl);
      const s = getStemFromFilename(inputName || outputName);
      return s === stem;
    });

    if (!target) {
      return respErr('file not found');
    }

    if (location === 'input') {
      await aiPlaygroundDb.deleteImagePair(target.id, user.id);
      return respData({ ok: true, sku, stem, location, deleted: ['input'] });
    }

    await aiPlaygroundDb.updateImagePair(target.id, user.id, {
      resultUrl: null,
    });
    return respData({ ok: true, sku, stem, location, deleted: ['output'] });
  } catch (error) {
    console.error('Delete image file error:', error);
    return respErr('Failed to delete file');
  }
}
