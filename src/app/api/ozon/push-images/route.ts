import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';
import { decryptCredential } from '@/lib/crypto';
import { z } from 'zod';

const pushImagesSchema = z.object({
  credentialId: z.string().min(1, 'Credential ID is required'),
  product_id: z.number().int().positive('Product ID must be a positive integer'),
  images: z.array(z.string().url()).min(1, 'At least one image URL is required'),
});

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = pushImagesSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const { credentialId, product_id, images } = validatedData.data;

    // 1. Get credential from database
    const credentialRecord = await ozonDb.getCredential(credentialId, user.id);

    if (!credentialRecord) {
      return respErr('Credential not found');
    }

    // 2. Decrypt credential
    const credential = decryptCredential(credentialRecord.encryptedData);

    // 3. Call backend API to push images to Ozon
    const backendUrl = process.env.PYTHON_SERVICE_URL || process.env.PYTHON_API_URL || 'http://localhost:8000';
    const backendApiKey = process.env.PYTHON_SERVICE_API_KEY || process.env.PYTHON_API_KEY || '';

    if (!backendApiKey) {
      console.error('PYTHON_SERVICE_API_KEY is not configured');
      return respErr('Backend API key is not configured');
    }

    const response = await fetch(`${backendUrl}/api/v1/ozon/push-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': backendApiKey,
      },
      body: JSON.stringify({
        credential: {
          client_id: credential.client_id,
          api_key: credential.api_key,
        },
        product_id,
        images,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return respErr(`Failed to push images: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return respData(result);
  } catch (error) {
    console.error('Push images error:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to push images');
  }
}
