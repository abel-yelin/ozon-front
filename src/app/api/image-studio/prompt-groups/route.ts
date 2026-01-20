import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// GET /api/image-studio/prompt-groups
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const groups = await aiPlaygroundDb.getPromptGroups(user.id);
    return respData({ groups });
  } catch (error) {
    console.error('Get ImageStudio prompt groups error:', error);
    return respErr('Failed to load prompt groups');
  }
}

// POST /api/image-studio/prompt-groups
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const name = String(body?.name || '').trim() || `提示词${Date.now()}`;

    const prefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const activeId = prefs.activePromptGroupId;
    let templates: Array<{ key: string; content: string; language?: string; category?: string }> = [];

    if (activeId) {
      const activeGroup = await aiPlaygroundDb.getPromptGroupWithTemplates(activeId);
      if (activeGroup && activeGroup.prompt_templates) {
        templates = Object.entries(activeGroup.prompt_templates).map(([key, content]) => ({
          key,
          content: String(content || ''),
        }));
      }
    }

    const group = await aiPlaygroundDb.createPromptGroup({
      userId: user.id,
      name,
      templates,
    });

    await aiPlaygroundDb.updateUserPromptPreferences(user.id, {
      activePromptGroupId: group.id,
    });

    return respData({ group });
  } catch (error) {
    console.error('Create ImageStudio prompt group error:', error);
    return respErr('Failed to create prompt group');
  }
}
