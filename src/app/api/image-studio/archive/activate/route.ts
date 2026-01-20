import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

async function updateArchiveState(userId: string, skus: string[], archived: boolean) {
  for (const sku of skus) {
    const state = await aiPlaygroundDb.getWorkflowStateByName(userId, sku);
    if (!state) continue;
    await aiPlaygroundDb.updateWorkflowState(state.id, userId, {
      state: archived ? 'archived' : 'pending',
    });
    const pairs = await aiPlaygroundDb.getUserImagePairs(userId, {
      workflowStateId: state.id,
      limit: 10000,
    });
    for (const pair of pairs) {
      await aiPlaygroundDb.updateImagePair(pair.id, userId, {
        archived,
      });
    }
  }
}

// POST /api/image-studio/archive/activate
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const rawSkus = body?.skus;
    const skus: string[] = Array.isArray(rawSkus)
      ? rawSkus.map((s) => String(s || '').trim()).filter(Boolean)
      : String(rawSkus || '')
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    if (!skus.length) {
      return respErr('skus required');
    }

    await updateArchiveState(user.id, skus, false);
    return respData({ ok: true, skus, archived: false });
  } catch (error) {
    console.error('Activate archive error:', error);
    return respErr('Failed to activate');
  }
}
