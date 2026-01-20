/**
 * ImageStudio API client
 * Interfaces with Python backend at dev/ozon-backen/demo2
 */

import type {
  SKU,
  ImagePair,
  StudioSettings,
  BatchProgress,
  BatchStats,
  SKUFilters,
  RegenOptions,
  Image,
  Job,
} from '@/shared/blocks/image-studio/types';

const API_BASE = '/api/image-studio';
const GALLERY_API = '/api/ozon/gallery';

// Gallery image type from API
type GalleryImage = {
  url: string;
  article: string;
  taskId: string;
  createdAt: string;
};

// Helper to convert gallery images to SKU format
function convertGalleryToSKUs(galleryImages: GalleryImage[]): SKU[] {
  // Group images by article
  const grouped = new Map<string, GalleryImage[]>();
  for (const image of galleryImages) {
    const current = grouped.get(image.article) || [];
    current.push(image);
    grouped.set(image.article, current);
  }

  // Convert to SKU format
  return Array.from(grouped.entries()).map(([article, images], index) => {
    const [mainImage, ...restImages] = images;
    return {
      id: `sku-${index}`,
      article,
      thumbnail: mainImage.url,
      status: 'done', // All gallery images are considered done
      isMainImage: index === 0, // First one is main image
      isApproved: true,
    };
  });
}

// ========================================
// Helper functions
// ========================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ========================================
// SKU Management
// ========================================

/**
 * Fetch list of SKUs with optional filters
 * Uses gallery API to get real data
 */
export async function fetchSKUs(filters?: SKUFilters): Promise<SKU[]> {
  const params = new URLSearchParams();
  params.append('limit', '240'); // Get more images

  console.log('[ImageStudio API] Fetching SKUs from gallery...');

  const response = await fetch(`${GALLERY_API}?${params.toString()}`);
  const data = await handleResponse<{ code: number; data?: { images?: GalleryImage[] } }>(response);

  console.log('[ImageStudio API] Gallery response:', data);

  if (data.code === 0 && data.data?.images) {
    let skus = convertGalleryToSKUs(data.data.images);

    console.log('[ImageStudio API] Converted SKUs:', skus);

    // Apply filters
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      skus = skus.filter(sku => sku.article.toLowerCase().includes(query));
    }

    if (filters?.onlyMainImages) {
      skus = skus.filter(sku => sku.isMainImage);
    }

    if (filters?.onlyApproved) {
      skus = skus.filter(sku => sku.isApproved);
    }

    // Status filtering doesn't apply to gallery (all are 'done')
    // but we keep the filter structure for consistency

    console.log('[ImageStudio API] Final SKUs after filters:', skus);
    return skus;
  }

  console.log('[ImageStudio API] No images found or invalid response');
  return [];
}

/**
 * Fetch a single SKU by ID
 */
export async function fetchSKU(id: string): Promise<SKU> {
  // Fetch all SKUs and find the matching one
  const skus = await fetchSKUs();
  const sku = skus.find(s => s.id === id);

  if (!sku) {
    throw new Error('SKU not found');
  }

  return sku;
}

/**
 * Update SKU approval status
 */
export async function updateSKUApproval(id: string, isApproved: boolean): Promise<SKU> {
  const response = await fetch(`${API_BASE}/skus/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isApproved }),
  });
  return handleResponse<SKU>(response);
}

/**
 * Update SKU main image flag
 */
export async function updateSKUMainImage(id: string, isMainImage: boolean): Promise<SKU> {
  const response = await fetch(`${API_BASE}/skus/${id}/main`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isMainImage }),
  });
  return handleResponse<SKU>(response);
}

// ========================================
// Image Management
// ========================================

/**
 * Fetch image pairs for a SKU
 * Returns images grouped by article from gallery
 */
export async function fetchImagePairs(skuId: string): Promise<ImagePair[]> {
  // Fetch all gallery images
  const params = new URLSearchParams();
  params.append('limit', '240');

  const response = await fetch(`${GALLERY_API}?${params.toString()}`);
  const data = await handleResponse<{ code: number; data?: { images?: GalleryImage[] } }>(response);

  if (data.code === 0 && data.data?.images) {
    // Find the SKU for this skuId
    const skus = convertGalleryToSKUs(data.data.images);
    const sku = skus.find(s => s.id === skuId);

    if (sku) {
      // Get all images for this article
      const articleImages = data.data.images.filter(img => img.article === sku.article);

      // Convert to image pairs (use first image as input, create output from it)
      return articleImages.map((image, index) => ({
        id: `pair-${index}`,
        inputImage: {
          id: `input-${index}`,
          url: image.url,
          filename: `${image.article}-${index}.jpg`,
        },
        outputImage: {
          id: `output-${index}`,
          url: image.url, // For now, use same image as output
          filename: `${image.article}-${index}-output.jpg`,
        },
        status: 'completed' as const,
        processingTime: 1000 + index * 100, // Mock processing time
      }));
    }
  }

  return [];
}

/**
 * Fetch a single image pair
 */
export async function fetchImagePair(skuId: string, pairId: string): Promise<ImagePair> {
  const response = await fetch(`${API_BASE}/skus/${skuId}/images/${pairId}`);
  return handleResponse<ImagePair>(response);
}

/**
 * Regenerate an image with options
 */
export async function regenerateImage(
  skuId: string,
  pairId: string,
  options: RegenOptions
): Promise<ImagePair> {
  const formData = new FormData();
  formData.append('options', JSON.stringify(options));
  if (options.refFile) {
    formData.append('refFile', options.refFile);
  }
  if (options.extraPrompt) {
    formData.append('extraPrompt', options.extraPrompt);
  }

  const response = await fetch(`${API_BASE}/skus/${skuId}/images/${pairId}/regenerate`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<ImagePair>(response);
}

/**
 * Download generated image
 */
export async function downloadImage(skuId: string, pairId: string, format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
  const response = await fetch(`${API_BASE}/skus/${skuId}/images/${pairId}/download?format=${format}`);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Batch download all approved images
 */
export async function downloadBatch(skus: string[], format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
  const response = await fetch(`${API_BASE}/download/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skus, format }),
  });
  if (!response.ok) {
    throw new Error(`Failed to download batch: ${response.statusText}`);
  }
  return response.blob();
}

// ========================================
// Batch Operations
// ========================================

/**
 * Start batch processing for selected SKUs
 */
export async function startBatch(skuIds: string[], settings: StudioSettings): Promise<Job> {
  const response = await fetch(`${API_BASE}/batch/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skuIds, settings }),
  });
  return handleResponse<Job>(response);
}

/**
 * Get batch progress
 */
export async function getBatchProgress(jobId: string): Promise<BatchProgress> {
  const response = await fetch(`${API_BASE}/batch/${jobId}/progress`);
  return handleResponse<BatchProgress>(response);
}

/**
 * Pause batch processing
 */
export async function pauseBatch(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/batch/${jobId}/pause`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to pause batch');
  }
}

/**
 * Resume batch processing
 */
export async function resumeBatch(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/batch/${jobId}/resume`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to resume batch');
  }
}

/**
 * Cancel batch processing
 */
export async function cancelBatch(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/batch/${jobId}/cancel`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to cancel batch');
  }
}

/**
 * Get batch statistics
 */
export async function getBatchStats(): Promise<BatchStats> {
  // Return mock stats for now
  const stats: BatchStats = {
    total: 10,
    completed: 5,
    failed: 1,
    pending: 4,
  };
  return stats;
}

// ========================================
// Settings
// ========================================

/**
 * Get studio settings
 */
export async function getSettings(): Promise<StudioSettings> {
  // Return default settings
  const settings: StudioSettings = {
    imageSize: '1536x1536',
    imageFormat: 'png',
    quality: 90,
    preserveOriginal: true,
  };
  return settings;
}

/**
 * Update studio settings
 */
export async function updateSettings(settings: Partial<StudioSettings>): Promise<StudioSettings> {
  // Return updated settings (would normally save to backend)
  const updated: StudioSettings = {
    imageSize: '1536x1536',
    imageFormat: 'png',
    quality: 90,
    preserveOriginal: true,
    ...settings,
  };
  return updated;
}

// ========================================
// Upload
// ========================================

/**
 * Upload source images for processing
 */
export async function uploadImages(files: File[]): Promise<{ uploaded: number; failed: number }> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<{ uploaded: number; failed: number }>(response);
}

/**
 * Upload a single reference image
 */
export async function uploadReferenceImage(file: File): Promise<{ url: string; id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload/reference`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<{ url: string; id: string }>(response);
}

// ========================================
// Prompt Groups
// ========================================

/**
 * Get user's active prompt group
 */
export async function getActivePromptGroup(): Promise<any> {
  const response = await fetch(`/api/ai-playground/prompt-preferences`);
  const data = await handleResponse<{ code: number; data: { preferences: any } }>(response);

  if (data.data.preferences.activePromptGroupId) {
    const groupRes = await fetch(
      `/api/ai-playground/prompt-groups/${data.data.preferences.activePromptGroupId}`
    );
    const groupData = await handleResponse<{ code: number; data: { group: any } }>(groupRes);
    return groupData.data.group;
  }

  return null;
}

/**
 * Get all prompt groups
 */
export async function getPromptGroups(): Promise<any[]> {
  const response = await fetch(`/api/ai-playground/prompt-groups`);
  const data = await handleResponse<{ code: number; data: { groups: any[] } }>(response);
  return data.data.groups;
}

/**
 * Update user's active prompt group
 */
export async function setActivePromptGroup(groupId: string): Promise<void> {
  const response = await fetch(`/api/ai-playground/prompt-preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activePromptGroupId: groupId }),
  });

  if (!response.ok) {
    throw new Error('Failed to set active prompt group');
  }
}
