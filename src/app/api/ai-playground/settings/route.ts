import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  defaultQuality: z.enum(['low', 'standard', 'high']).optional(),
  defaultFormat: z.enum(['png', 'jpg', 'webp']).optional(),
  autoApprove: z.boolean().optional(),
  batchSize: z.number().min(1).max(100).optional(),
  notificationEnabled: z.boolean().optional(),
});

// GET - Get user's AI Playground settings
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const settings = await aiPlaygroundDb.getUserSettings(user.id);

    return respData(settings);
  } catch (error) {
    console.error('Get AI settings error:', error);
    return respErr('Failed to get settings');
  }
}

// PATCH - Update user's AI Playground settings
export async function PATCH(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = updateSettingsSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // Update settings
    const updated = await aiPlaygroundDb.updateUserSettings(user.id, validatedData.data);

    return respData(updated);
  } catch (error) {
    console.error('Update AI settings error:', error);
    return respErr('Failed to update settings');
  }
}
