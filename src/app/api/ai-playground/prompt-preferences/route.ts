import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  activePromptGroupId: z.string().optional(),
  professionalModeEnabled: z.boolean().optional(),
  useEnglish: z.boolean().optional(),
  defaultTemperature: z.number().optional(),
  targetWidth: z.number().optional(),
  targetHeight: z.number().optional(),
  imageFormat: z.string().optional(),
  quality: z.number().optional(),
  preserveOriginal: z.boolean().optional(),
});

// GET /api/ai-playground/prompt-preferences - Get user preferences
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const prefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    return respData({ preferences: prefs });
  } catch (error) {
    console.error('Get prompt preferences error:', error);
    return respErr('Failed to load preferences');
  }
}

// PATCH /api/ai-playground/prompt-preferences - Update user preferences
export async function PATCH(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = updatePreferencesSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const prefs = await aiPlaygroundDb.updateUserPromptPreferences(
      user.id,
      validatedData.data
    );

    return respData({ preferences: prefs });
  } catch (error) {
    console.error('Update prompt preferences error:', error);
    return respErr('Failed to update preferences');
  }
}
