import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getImageStudioJobLogs } from '@/lib/api/image-studio-server';

// GET /api/image-studio/job-logs/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const tail = searchParams.get('tail');
    const full = searchParams.get('full');
    const query = new URLSearchParams();
    if (from !== null) query.set('from', from);
    if (tail !== null) query.set('tail', tail);
    if (full !== null) query.set('full', full);

    const data = await getImageStudioJobLogs(id, query.toString() ? `?${query.toString()}` : '');
    return respData(data);
  } catch (error) {
    console.error('Get ImageStudio job logs error:', error);
    return respErr('Failed to load job logs');
  }
}
