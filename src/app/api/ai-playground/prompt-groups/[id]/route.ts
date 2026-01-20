import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { z } from 'zod';

const updatePromptGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  templates: z.array(z.object({
    key: z.string(),
    content: z.string(),
    language: z.string().optional(),
    category: z.string().optional(),
  })).optional(),
});

// GET /api/ai-playground/prompt-groups/[id] - Get single group with templates
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const group = await aiPlaygroundDb.getPromptGroupWithTemplates(params.id);

    if (!group) {
      return respErr('Prompt group not found');
    }

    return respData({ group });
  } catch (error) {
    console.error('Get prompt group error:', error);
    return respErr('Failed to load prompt group');
  }
}

// PATCH /api/ai-playground/prompt-groups/[id] - Update group
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = updatePromptGroupSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // If templates are being updated, use the full update method
    if (validatedData.data.templates) {
      const group = await aiPlaygroundDb.updatePromptGroupWithTemplates(
        params.id,
        validatedData.data
      );
      return respData({ group });
    }

    // Otherwise just update basic fields
    const group = await aiPlaygroundDb.updatePromptGroup(
      params.id,
      validatedData.data
    );

    return respData({ group });
  } catch (error) {
    console.error('Update prompt group error:', error);
    return respErr('Failed to update prompt group');
  }
}

// DELETE /api/ai-playground/prompt-groups/[id] - Soft delete group
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const group = await aiPlaygroundDb.deletePromptGroup(params.id);

    return respData({ group });
  } catch (error) {
    console.error('Delete prompt group error:', error);
    return respErr('Failed to delete prompt group');
  }
}
