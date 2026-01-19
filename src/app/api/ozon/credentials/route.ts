import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { ozonDb } from '@/lib/db/ozon';
import { encryptCredential, validateCredential } from '@/lib/crypto';
import { z } from 'zod';
import type { ozonCredential } from '@/config/db/schema';

const createCredentialSchema = z.object({
  name: z.string().min(1, 'Credential name is required'),
  client_id: z.string().min(1, 'Client ID is required'),
  api_key: z.string().min(1, 'API Key is required'),
});

const updateCredentialSchema = z.object({
  name: z.string().min(1, 'Credential name is required'),
});

// GET - Get current user's credential list
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const credentials = await ozonDb.getUserCredentials(user.id);

    // Don't return encrypted data to frontend
    const safeCredentials = credentials.map(
      ({ encryptedData: _encryptedData, ...rest }: typeof ozonCredential.$inferSelect) => rest
    );

    return respData(safeCredentials);
  } catch (error) {
    console.error('Get credentials error:', error);
    return respErr('Failed to get credentials');
  }
}

// POST - Create new credential
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Validate input
    const validatedData = createCredentialSchema.safeParse(body);
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    // Encrypt credential
    const encryptedData = encryptCredential({
      client_id: validatedData.data.client_id,
      api_key: validatedData.data.api_key,
    });

    // Save to database
    const credential = await ozonDb.createCredential({
      userId: user.id,
      name: validatedData.data.name,
      encryptedData,
    });

    // Don't return encrypted data
    const { encryptedData: _, ...safeCredential } = credential;

    return respData(safeCredential);
  } catch (error) {
    console.error('Create credential error:', error);
    return respErr('Failed to create credential');
  }
}

// PUT - Update credential name
export async function PUT(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return respErr('Missing required fields: id, name');
    }

    // Validate input
    const validatedData = updateCredentialSchema.safeParse({ name });
    if (!validatedData.success) {
      return respErr(validatedData.error.issues[0].message);
    }

    const credential = await ozonDb.updateCredentialName(
      id,
      user.id,
      validatedData.data.name
    );

    if (!credential) {
      return respErr('Credential not found');
    }

    // Don't return encrypted data
    const { encryptedData: _, ...safeCredential } = credential;

    return respData(safeCredential);
  } catch (error) {
    console.error('Update credential error:', error);
    return respErr('Failed to update credential');
  }
}

// DELETE - Delete credential
export async function DELETE(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return respErr('Missing credential id');
    }

    await ozonDb.deleteCredential(id, user.id);

    return respData({ success: true });
  } catch (error) {
    console.error('Delete credential error:', error);
    return respErr('Failed to delete credential');
  }
}
