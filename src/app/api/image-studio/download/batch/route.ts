import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getUserGalleryImages } from '@/shared/services/gallery';

/**
 * Batch download approved/generated images for selected SKUs
 * POST /api/image-studio/download/batch
 *
 * Request body:
 * {
 *   skus: string[],  // SKU list to download
 *   format: 'png' | 'jpg' | 'webp'
 * }
 *
 * Returns: JSON response with all image URLs
 * (Client-side will handle the actual downloading/ZIP creation)
 */
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const skus = Array.isArray(body.skus) ? body.skus.map((s: any) => String(s).trim()).filter(Boolean) : [];
    const format = String(body.format || 'png').trim() as 'png' | 'jpg' | 'webp';

    if (!skus.length) {
      return respErr('SKUs are required');
    }

    if (!['png', 'jpg', 'webp'].includes(format)) {
      return respErr('Invalid format. Must be png, jpg, or webp');
    }

    // Get workflow states for user
    const workflowStates = await aiPlaygroundDb.getUserWorkflowStates(user.id, { limit: 500 });
    const stateByName = new Map<string, any>(workflowStates.map((s: any) => [s.name, s]));

    // Get image pairs for all workflow states
    const allImagePairs = await aiPlaygroundDb.getUserImagePairs(user.id, { limit: 10000 });
    const pairByWorkflow = new Map<string, any[]>();
    for (const pair of allImagePairs) {
      if (!pair.workflowStateId) continue;
      const list = pairByWorkflow.get(pair.workflowStateId) || [];
      list.push(pair);
      pairByWorkflow.set(pair.workflowStateId, list);
    }

    // Collect all generated images
    const downloadItems: Array<{
      sku: string;
      filename: string;
      url: string;
    }> = [];

    for (const skuName of skus) {
      const state = stateByName.get(skuName);
      if (!state) {
        console.warn(`[BatchDownload] No workflow state for SKU: ${skuName}`);
        continue;
      }

      // Get all image pairs for this SKU's workflow state
      const pairs = pairByWorkflow.get(state.id) || [];

      for (const pair of pairs) {
        // Only include images that have been generated (have resultUrl)
        if (!pair.resultUrl) {
          continue;
        }

        const sourceFileName = pair.sourceUrl.split('/').pop() || `image-${pair.id}`;
        const baseName = sourceFileName.replace(/\.[^/.]+$/, ''); // Remove extension

        downloadItems.push({
          sku: skuName,
          filename: `${baseName}.${format}`,
          url: pair.resultUrl,
        });
      }
    }

    if (downloadItems.length === 0) {
      return respErr('No generated images found for the selected SKUs');
    }

    // Return JSON with download URLs
    // Client will handle actual file downloads and ZIP creation
    return respData({
      items: downloadItems,
      total: downloadItems.length,
      format,
      message: `Found ${downloadItems.length} images for download`,
    });
  } catch (error) {
    console.error('Batch download error:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to download batch');
  }
}
