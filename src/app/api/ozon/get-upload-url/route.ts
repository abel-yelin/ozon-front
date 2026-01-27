import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { z } from 'zod';

const getUploadUrlSchema = z.object({
  r2_path: z.string().min(1, 'R2 path is required'),
});

/**
 * Generate R2 presigned upload URL
 * This allows the frontend to directly upload to R2 bypassing the backend
 */
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = getUploadUrlSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const { r2_path } = validatedData.data;

    // TODO: Generate presigned URL for R2
    // This requires the R2 SDK or direct API call to Cloudflare R2

    // Option 1: Call Python backend to get presigned URL
    // Option 2: Generate directly using R2 SDK (if R2 credentials available)

    // For now, return the public URL format
    const public_url = `https://r0.image2url.com/${r2_path}`;

    // You need to implement the actual presigned URL generation
    // Here's a placeholder for the backend implementation:

    try {
      // Call Python backend to get presigned URL
      const pythonBackendUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      const apiKey = process.env.PYTHON_SERVICE_API_KEY || '';

      const response = await fetch(`${pythonBackendUrl}/api/v1/ozon/r2/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ r2_path: r2_path }),
      });

      if (!response.ok) {
        // If backend doesn't support this, return the direct URL format
        console.warn('Backend presigned URL endpoint not available, using direct URL');
        return respData({
          upload_url: public_url,
          public_url: public_url,
        });
      }

      const data = await response.json();
      return respData(data);

    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      // Fallback: return direct URL format
      return respData({
        upload_url: public_url,
        public_url: public_url,
      });
    }
  } catch (error) {
    console.error('Get upload URL error:', error);
    return respErr('Failed to get upload URL');
  }
}
