import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// POST /api/image-studio/review/batch
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const approved = Boolean(body?.approved);
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

    for (const sku of skus) {
      const state = await aiPlaygroundDb.getWorkflowStateByName(user.id, sku);
      if (!state) continue;
      await aiPlaygroundDb.updateWorkflowState(state.id, user.id, {
        state: approved ? 'approved' : 'pending',
      });
    }

    return respData({ ok: true, skus, approved });
  } catch (error) {
    console.error('Batch review error:', error);
    return respErr('Failed to update review status');
  }
}
