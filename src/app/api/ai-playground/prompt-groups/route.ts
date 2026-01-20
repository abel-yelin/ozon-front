import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { z } from 'zod';

const templateSchema = z.object({
  key: z.string().min(1),
  content: z.string().min(1),
  language: z.string().default('cn'),
  category: z.string().optional(),
});

const createPromptGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  templates: z.array(templateSchema).min(0),
  isSystemDefault: z.boolean().optional().default(false),
});

// GET /api/ai-playground/prompt-groups - List all prompt groups
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const groups = await aiPlaygroundDb.getPromptGroups(user.id);
    return respData({ groups });
  } catch (error) {
    console.error('Get prompt groups error:', error);
    return respErr('Failed to load prompt groups');
  }
}

// POST /api/ai-playground/prompt-groups - Create new prompt group
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = createPromptGroupSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // Admin-only for system defaults
    if (validatedData.data.isSystemDefault) {
      // TODO: Add admin check
      return respErr('Only admins can create system defaults');
    }

    const group = await aiPlaygroundDb.createPromptGroup({
      userId: user.id,
      name: validatedData.data.name,
      description: validatedData.data.description,
      templates: validatedData.data.templates,
      isSystemDefault: false,
    });

    return respData({ group });
  } catch (error) {
    console.error('Create prompt group error:', error);
    return respErr('Failed to create prompt group');
  }
}
