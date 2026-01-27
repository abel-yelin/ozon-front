/**
 * Example component: Browser-based Ozon to R2 upload
 *
 * This component demonstrates how to download images from Ozon CDN
 * and upload them directly to R2 using the browser, bypassing
 * the Python backend that has connectivity issues.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { downloadAndUploadImage, ozonUrlToR2Path } from '@/lib/utils/ozon-browser-upload';

interface OzonImage {
  ozonUrl: string;
  article: string;
}

interface BrowserUploadButtonProps {
  images: OzonImage[];
  userId: string;
  onComplete?: (results: Array<{ ozonUrl: string; publicUrl: string; success: boolean }>) => void;
}

export function BrowserUploadButton({ images, userId, onComplete }: BrowserUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ ozonUrl: string; publicUrl: string; success: boolean }>>([]);

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    setProgress(0);
    setResults([]);

    try {
      console.log(`[Browser Upload] Starting upload for ${images.length} images`);

      const uploadResults = await Promise.all(
        images.map(async (image, index) => {
          try {
            console.log(`[Browser Upload] Processing ${index + 1}/${images.length}:`, image.ozonUrl);

            const r2Path = ozonUrlToR2Path(image.ozonUrl, userId, image.article);

            const result = await downloadAndUploadImage(
              image.ozonUrl,
              r2Path,
              (loaded, total) => {
                // Calculate overall progress
                const globalLoaded = loaded + index * total;
                const globalTotal = images.length * total;
                const percentage = Math.round((globalLoaded / globalTotal) * 100);
                setProgress(percentage);
              }
            );

            console.log(`[Browser Upload] Success for ${image.ozonUrl}:`, result.publicUrl);

            return {
              ozonUrl: image.ozonUrl,
              publicUrl: result.publicUrl,
              success: true,
            };
          } catch (err) {
            console.error(`[Browser Upload] Failed for ${image.ozonUrl}:`, err);

            return {
              ozonUrl: image.ozonUrl,
              publicUrl: '',
              success: false,
            };
          }
        })
      );

      setResults(uploadResults);

      const successCount = uploadResults.filter((r) => r.success).length;
      const failCount = uploadResults.filter((r) => !r.success).length;

      console.log(`[Browser Upload] Complete: ${successCount} success, ${failCount} failed`);

      if (failCount > 0) {
        setError(`${failCount} images failed to upload. Check console for details.`);
      }

      onComplete?.(uploadResults);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      console.error('[Browser Upload] Error:', err);
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="gap-2"
          size="lg"
        >
          <Download className="h-4 w-4" />
          {uploading ? 'Uploading...' : `Download ${images.length} Images to R2`}
        </Button>

        {uploading && (
          <div className="flex-1 max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-600 mt-1">{progress}% complete</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Upload Failed</div>
              <div className="text-xs mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && !uploading && (
        <div className="rounded-md border p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm">Upload Results</h3>
            {successCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                {successCount} success
              </span>
            )}
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-700">
                <AlertCircle className="h-3 w-3" />
                {failCount} failed
              </span>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
            {results.slice(0, 10).map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.success ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[10px]" title={result.ozonUrl}>
                    {result.ozonUrl.substring(0, 50)}...
                  </div>
                  {result.success && (
                    <div className="truncate text-blue-600" title={result.publicUrl}>
                      {result.publicUrl}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Usage Example:
 *
 * function OzonDownloadPage() {
 *   const [user] = useUser();
 *   const images = [
 *     {
 *       ozonUrl: 'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg',
 *       article: '2194435300',
 *     },
 *     {
 *       ozonUrl: 'https://cdn1.ozone.ru/s3/multimedia-1-8/8332337600.jpg',
 *       article: '2194435300',
 *     },
 *   ];
 *
 *   return (
 *     <BrowserUploadButton
 *       images={images}
 *       userId={user.id}
 *       onComplete={(results) => {
 *         console.log('Upload complete:', results);
 *       }}
 *     />
 *   );
 * }
 */
