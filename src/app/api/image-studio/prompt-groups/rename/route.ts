import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// POST /api/image-studio/prompt-groups/rename
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const id = String(body?.id || '').trim();
    const name = String(body?.name || '').trim();

    if (!id || !name) {
      return respErr('id/name required');
    }

    const group = await aiPlaygroundDb.updatePromptGroup(id, { name });
    if (!group) {
      return respErr('Prompt group not found');
    }

    return respData({ ok: true, group });
  } catch (error) {
    console.error('Rename prompt group error:', error);
    return respErr('Failed to rename prompt group');
  }
}
