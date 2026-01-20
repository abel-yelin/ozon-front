import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// POST /api/image-studio/prompt-groups/delete
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

    const prefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const group = await aiPlaygroundDb.deletePromptGroup(id);
    if (!group) {
      return respErr('Prompt group not found');
    }

    if (prefs.activePromptGroupId === id) {
      const groups = await aiPlaygroundDb.getPromptGroups(user.id);
      const nextId = groups.find((g) => g.id !== id)?.id;
      if (nextId) {
        await aiPlaygroundDb.updateUserPromptPreferences(user.id, {
          activePromptGroupId: nextId,
        });
      }
    }

    return respData({ ok: true });
  } catch (error) {
    console.error('Delete prompt group error:', error);
    return respErr('Failed to delete prompt group');
  }
}
