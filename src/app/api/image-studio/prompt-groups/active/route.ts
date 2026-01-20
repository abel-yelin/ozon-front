import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// POST /api/image-studio/prompt-groups/active
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const id = String(body?.id || '').trim();
    if (!id) {
      return respErr('id required');
    }

    const group = await aiPlaygroundDb.getPromptGroupWithTemplates(id);
    if (!group) {
      return respErr('Prompt group not found');
    }

    await aiPlaygroundDb.updateUserPromptPreferences(user.id, {
      activePromptGroupId: id,
    });

    return respData({ ok: true });
  } catch (error) {
    console.error('Activate prompt group error:', error);
    return respErr('Failed to activate prompt group');
  }
}
