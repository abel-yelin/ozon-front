import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';

// GET - Get download trends for specified period
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get('period') || '7');

    if (period < 1 || period > 90) {
      return respErr('Period must be between 1 and 90 days');
    }

    const trends = await ozonDb.getDailyTrends(user.id, period);

    return respData({
      period: `${period}d`,
      daily: trends,
    });
  } catch (error) {
    console.error('Get dashboard trends error:', error);
    return respErr('Failed to get dashboard trends');
  }
}
