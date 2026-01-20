import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { aiPlaygroundApi } from '@/lib/api/ai-playground';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const formData = await req.formData();
    const files = formData.getAll('files').filter((item) => item instanceof File) as File[];

    if (files.length === 0) {
      return respErr('No files uploaded');
    }

    const uploadResponse = await aiPlaygroundApi.uploadImages(files);
    if (!uploadResponse.success || !uploadResponse.data) {
      return respErr(uploadResponse.error || 'Upload failed');
    }

    const storedImages = [];
    for (const item of uploadResponse.data) {
      const record = await aiPlaygroundDb.createImagePair({
        userId: user.id,
        sourceUrl: item.url,
        metadata: {
          filename: item.filename,
          contentType: item.content_type,
          size: item.size,
          status: 'uploaded',
          uploadedAt: new Date().toISOString(),
        },
      });

      storedImages.push({
        id: record.id,
        url: record.sourceUrl,
        name: item.filename,
        size: item.size,
      });
    }

    return respData(storedImages);
  } catch (error) {
    console.error('Upload AI images error:', error);
    return respErr('Failed to upload images');
  }
}
