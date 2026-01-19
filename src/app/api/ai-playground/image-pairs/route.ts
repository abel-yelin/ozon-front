import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';

// GET - Get user's image pairs
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const workflowStateId = searchParams.get('workflowStateId') || undefined;
    const jobId = searchParams.get('jobId') || undefined;
    const approved = searchParams.get('approved') === 'true' ? true : searchParams.get('approved') === 'false' ? false : undefined;
    const archived = searchParams.get('archived') === 'true' ? true : searchParams.get('archived') === 'false' ? false : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const imagePairs = await aiPlaygroundDb.getUserImagePairs(user.id, {
      workflowStateId,
      jobId,
      approved,
      archived,
      limit,
    });

    return respData(imagePairs);
  } catch (error) {
    console.error('Get image pairs error:', error);
    return respErr('Failed to get image pairs');
  }
}
