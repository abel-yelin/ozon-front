import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

// GET - Get user dashboard summary statistics
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const summary = await ozonDb.getUserSummary(user.id);

    return respData(summary);
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return respErr('Failed to get dashboard summary');
  }
}
