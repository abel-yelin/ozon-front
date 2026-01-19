import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { z } from 'zod';

const updateImagePairSchema = z.object({
  approved: z.boolean().optional(),
  archived: z.boolean().optional(),
  resultUrl: z.string().optional(),
});

// PATCH - Update image pair
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id: pairId } = await params;
    const body = await req.json();

    // Validate input
    const validatedData = updateImagePairSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // Check if image pair exists and belongs to user
    const pair = await aiPlaygroundDb.getImagePair(pairId, user.id);
    if (!pair) {
      return respErr('Image pair not found');
    }

    // Update image pair
    const updated = await aiPlaygroundDb.updateImagePair(pairId, user.id, validatedData.data);

    return respData(updated);
  } catch (error) {
    console.error('Update image pair error:', error);
    return respErr('Failed to update image pair');
  }
}

// DELETE - Delete image pair
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id: pairId } = await params;

    // Delete image pair
    const deleted = await aiPlaygroundDb.deleteImagePair(pairId, user.id);

    return respData(deleted);
  } catch (error) {
    console.error('Delete image pair error:', error);
    return respErr('Failed to delete image pair');
  }
}
