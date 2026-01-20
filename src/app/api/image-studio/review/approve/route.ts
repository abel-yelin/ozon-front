import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// POST /api/image-studio/review/approve
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const sku = String(body?.sku || '').trim();
    const approved = Boolean(body?.approved);
    if (!sku) {
      return respErr('sku required');
    }

    const state = await aiPlaygroundDb.getWorkflowStateByName(user.id, sku);
    if (!state) {
      return respErr('SKU not found');
    }

    await aiPlaygroundDb.updateWorkflowState(state.id, user.id, {
      state: approved ? 'approved' : 'pending',
    });

    return respData({ ok: true, sku, approved });
  } catch (error) {
    console.error('Approve SKU error:', error);
    return respErr('Failed to update review status');
  }
}
