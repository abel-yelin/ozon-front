/**
 * Browser-based R2 upload utilities
 * Downloads images from Ozon CDN and uploads directly to R2
 */

export interface UploadUrlResponse {
  upload_url: string;
  public_url: string;
}

/**
 * Get presigned URL for uploading to R2
 */
export async function getR2UploadUrl(r2Path: string): Promise<UploadUrlResponse> {
  const response = await fetch('/api/ozon/get-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ r2_path: r2Path }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to get upload URL');
  }

  const data = await response.json();

  console.log('[getR2UploadUrl] Full response:', JSON.stringify(data, null, 2));
  console.log('[getR2UploadUrl] Response success:', data.success);
  console.log('[getR2UploadUrl] Response data:', data.data);
  console.log('[getR2UploadUrl] Response message:', data.message);

  if (!data.success || !data.data) {
    console.error('[getR2UploadUrl] Invalid response structure:', {
      hasSuccess: 'success' in data,
      hasData: 'data' in data,
      hasMessage: 'message' in data,
      success: data.success,
      data: data.data,
      message: data.message,
    });
    throw new Error(data.message || 'Invalid response format from server');
  }

  return data.data;
}

/**
 * Download image from Ozon CDN and upload to R2
 * Browser-based upload - bypasses Python backend limitations
 */
export async function downloadAndUploadImage(
  ozonImageUrl: string,
  r2Path: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ publicUrl: string; success: boolean }> {
  try {
    console.info('[Browser Upload] Starting download:', ozonImageUrl);

    // Step 1: Download image from Ozon CDN using browser
    const response = await fetch(ozonImageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Get content length for progress tracking
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    // Read the image data as blob
    const reader = response.body?.getReader();
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    if (!reader) {
      // Fallback for older browsers
      const blob = await response.blob();
      receivedLength = blob.size;
      onProgress?.(receivedLength, contentLength);
    } else {
      // Stream the download
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        onProgress?.(receivedLength, contentLength);
      }
    }

    // Create blob from chunks
    const blob = reader
      ? new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'image/jpeg' })
      : await response.blob();

    console.info('[Browser Upload] Download complete:', {
      size: blob.size,
      type: blob.type,
    });

    // Step 2: Get R2 upload URL
    const { upload_url, public_url } = await getR2UploadUrl(r2Path);

    console.info('[Browser Upload] Got upload URL:', { upload_url, public_url });

    // Step 3: Upload to R2
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }

    console.info('[Browser Upload] Upload complete:', public_url);

    return {
      publicUrl: public_url,
      success: true,
    };
  } catch (error) {
    console.error('[Browser Upload] Failed:', error);
    throw error;
  }
}

/**
 * Batch download and upload multiple images
 */
export async function batchDownloadAndUpload(
  images: Array<{ ozonUrl: string; r2Path: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ ozonUrl: string; r2Path: string; publicUrl: string; success: boolean }>> {
  const results: Array<{ ozonUrl: string; r2Path: string; publicUrl: string; success: boolean }> = [];

  for (let i = 0; i < images.length; i++) {
    const { ozonUrl, r2Path } = images[i];

    onProgress?.(i + 1, images.length);

    try {
      const result = await downloadAndUploadImage(ozonUrl, r2Path, (loaded, total) => {
        const globalLoaded = loaded + (i * total);
        const globalTotal = images.length * total;
        onProgress?.(globalLoaded, globalTotal);
      });

      results.push({
        ozonUrl,
        r2Path,
        publicUrl: result.publicUrl,
        success: true,
      });
    } catch (error) {
      console.error(`[Browser Upload] Failed for ${ozonUrl}:`, error);
      results.push({
        ozonUrl,
        r2Path,
        publicUrl: '',
        success: false,
      });
    }
  }

  return results;
}

/**
 * Convert Ozon CDN URL to R2 path
 * Example:
 *   Input: https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg
 *   Output: users/user123/ozon/2194435300/8388316998.jpg
 */
export function ozonUrlToR2Path(ozonUrl: string, userId: string, article: string): string {
  try {
    // Extract filename from URL
    const url = new URL(ozonUrl);
    const filename = url.pathname.split('/').pop() || 'image.jpg';

    // Clean article ID (remove any suffix)
    const cleanArticle = article.split('-')[0];

    // Generate R2 path
    return `users/${userId}/ozon/${cleanArticle}/${filename}`;
  } catch (error) {
    console.error('Failed to parse Ozon URL:', error);
    // Fallback: use hash of URL as filename
    return `users/${userId}/ozon/${article}/${Date.now()}.jpg`;
  }
}

/**
 * Usage example:
 *
 * const ozonImageUrl = 'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg';
 * const r2Path = ozonUrlToR2Path(ozonImageUrl, user.id, '2194435300');
 *
 * const result = await downloadAndUploadImage(ozonImageUrl, r2Path, (loaded, total) => {
 *   console.log(`Progress: ${loaded}/${total} bytes`);
 * });
 *
 * console.log('Public URL:', result.publicUrl);
 */
