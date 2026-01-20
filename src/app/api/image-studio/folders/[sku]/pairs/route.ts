import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getFileNameFromUrl, getStemFromFilename, isMainStem } from '@/shared/lib/image-studio';

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

    const state = await aiPlaygroundDb.getWorkflowStateByName(user.id, skuName);
    if (!state) {
      return respData({ sku: skuName, pairs: [] });
    }

    const pairs = await aiPlaygroundDb.getUserImagePairs(user.id, {
      workflowStateId: state.id,
      limit: 10000,
    });

    const formatted = pairs.map((pair) => {
      const inputName = getFileNameFromUrl(pair.sourceUrl);
      const outputName = getFileNameFromUrl(pair.resultUrl);
      const stem = getStemFromFilename(inputName || outputName);
      const isMain = isMainStem(stem);
      return {
        stem,
        is_main: isMain,
        input_url: pair.sourceUrl,
        output_url: pair.resultUrl || null,
        input_name: inputName,
        output_name: outputName,
        pair_id: pair.id,
      };
    });

    return respData({ sku: skuName, pairs: formatted });
  } catch (error) {
    console.error('Get ImageStudio pairs error:', error);
    return respErr('Failed to load pairs');
  }
}
