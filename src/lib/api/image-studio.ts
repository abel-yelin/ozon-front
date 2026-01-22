/**
 * ImageStudio API client
 * Interfaces with FastAPI backend
 */

import type {
  SKU,
  ImagePair,
  StudioSettings,
  BatchProgress,
  BatchStats,
  BatchStatus,
  SKUFilters,
  RegenOptions,
} from '@/shared/blocks/image-studio/types';

const API_BASE = '/api/image-studio';

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
  const response = await fetch(`${API_BASE}/folders`);
  const data = await handleResponse<{ code: number; data?: { folders?: any[] } }>(response);

  if (data.code !== 0 || !data.data?.folders) {
    return [];
  }

  let skus = data.data.folders.map((folder) => ({
    id: folder.sku,
    article: folder.sku,
    thumbnail: folder.thumbnail_url || '',
    status: folder.status || 'not_generated',
    isMainImage: Boolean(folder.has_main),
    isApproved: folder.review_status === 'approved',
    createdAt: '',
    archived: Boolean(folder.archived),
    reviewStatus: folder.review_status || '',
    inputCount: folder.input_count || 0,
    outputCount: folder.output_count || 0,
    workflowStateId: folder.workflow_state_id || undefined,
  }));

  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    skus = skus.filter((sku) => sku.article.toLowerCase().includes(query));
  }

  if (filters?.onlyMainImages) {
    skus = skus.filter((sku) => sku.isMainImage);
  }

  if (filters?.onlyApproved) {
    skus = skus.filter((sku) => sku.isApproved);
  }

  if (filters?.status && filters.status !== 'all') {
    skus = skus.filter((sku) => sku.status === filters.status);
  }

  return skus;
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
  const response = await fetch(`${API_BASE}/review/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: id, approved: isApproved }),
  });
  await handleResponse<any>(response);
  return fetchSKU(id);
}

/**
 * Update SKU main image flag
 */
export async function updateSKUMainImage(id: string, isMainImage: boolean): Promise<SKU> {
  return fetchSKU(id);
}

// ========================================
// Image Management
// ========================================

/**
 * Fetch image pairs for a SKU
 * Returns images grouped by article from gallery
 */
export async function fetchImagePairs(skuId: string): Promise<ImagePair[]> {
  const response = await fetch(`${API_BASE}/folders/${encodeURIComponent(skuId)}/pairs`);
  const data = await handleResponse<{ code: number; data?: { pairs?: any[] } }>(response);
  if (data.code !== 0 || !data.data?.pairs) {
    return [];
  }

  return data.data.pairs.map((pair) => {
    const hasOutput = Boolean(pair.output_url);
    return {
      id: pair.stem || pair.pair_id,
      stem: pair.stem,
      isMain: Boolean(pair.is_main),
      inputUrl: pair.input_url,
      outputUrl: pair.output_url || null,
      inputName: pair.input_name || '',
      outputName: pair.output_name || '',
      status: hasOutput ? 'done' : 'pending',
    };
  });
}

/**
 * Fetch a single image pair
 */
export async function fetchImagePair(skuId: string, pairId: string): Promise<ImagePair> {
  const pairs = await fetchImagePairs(skuId);
  const pair = pairs.find((p) => p.id === pairId || p.stem === pairId);
  if (!pair) {
    throw new Error('Image pair not found');
  }
  return pair;
}

/**
 * Regenerate an image with options
 */
export async function regenerateImage(
  skuId: string,
  pairId: string,
  options: RegenOptions
): Promise<{ jobId: string }> {
  console.info('[ImageStudio] API regenerateImage', { skuId, pairId });
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'image_custom_generate',
      sku: skuId,
      stem: pairId,
      options: {
        include_common: options.includeCommon,
        include_role: options.includeRole,
        include_title_details: options.includeTitleDetails,
        include_plan: options.includePlan,
        include_style: options.includeStyle,
        remove_watermark: options.optWatermark,
        remove_logo: options.optLogo,
        text_edit: options.optTextEdit,
        restructure: options.optRestructure,
        recolor: options.optRecolor,
        add_markers: options.optAddMarkers,
        strong_consistency: options.strongConsistency,
        extra_prompt: options.extraPrompt || '',
      },
    }),
  });

  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    console.error('[ImageStudio] API regenerateImage failed', data);
    throw new Error(data.message || 'Regenerate failed');
  }
  const jobId = data.data?.job_id || '';
  console.info('[ImageStudio] API regenerateImage queued', jobId);
  return { jobId };
}

export async function getJobStatus(jobId: string): Promise<{ status: string; error?: string | null }> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to get job status');
  }
  return {
    status: data.data?.status || 'pending',
    error: data.data?.error || null,
  };
}

/**
 * Download generated image
 */
export async function downloadImage(skuId: string, pairId: string, format: 'png' | 'jpg' | 'webp'): Promise<Blob> {
  const pair = await fetchImagePair(skuId, pairId);
  const url = pair.outputUrl || pair.inputUrl;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Batch download all approved images
 * Returns JSON with image URLs, caller must handle ZIP creation
 */
export async function downloadBatch(
  skus: string[],
  format: 'png' | 'jpg' | 'webp'
): Promise<{
  items: Array<{ sku: string; filename: string; url: string }>;
  total: number;
  format: string;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/download/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skus, format }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Failed to download batch: ${response.statusText}`);
  }

  const data = await handleResponse<{
    code: number;
    data?: {
      items: Array<{ sku: string; filename: string; url: string }>;
      total: number;
      format: string;
      message: string;
    };
  }>(response);

  if (data.code !== 0 || !data.data) {
    throw new Error(data.data?.message || 'Failed to get download list');
  }

  return data.data;
}

// ========================================
// Batch Operations
// ========================================

/**
 * Start batch processing for selected SKUs
 */
export async function startBatch(skuIds: string[], settings: StudioSettings): Promise<{ id: string }> {
  console.log('[ImageStudio API] Starting batch', { skuIds, settings });

  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'batch_series_generate', sku: '__batch__', options: { skus: skuIds, settings } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ImageStudio API] Batch start failed', { status: response.status, error: errorText });
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('[ImageStudio API] Batch start response', data);

  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to start batch');
  }

  const jobId = data.data?.job_id;
  if (!jobId) {
    throw new Error('No job ID returned from server');
  }

  return { id: jobId };
}

/**
 * Get batch progress
 */
export async function getBatchProgress(jobId: string): Promise<BatchProgress> {
  const response = await fetch(`${API_BASE}/jobs`);
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to get progress');
  }

  // Find the current batch job
  const jobs = data.data?.jobs || [];
  const batchJob = jobs.find((j: any) => j.id === jobId);

  if (!batchJob) {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      percentage: 0,
      status: 'idle' as BatchStatus,
    };
  }

  const cfg = batchJob.config || {};
  const skuList = cfg.options?.skus || [];
  const total = skuList.length;

  // For batch jobs, we estimate progress based on job status
  // When job is processing, we check if there are results
  const status = batchJob.status || 'pending';

  // If completed, all SKUs are done
  if (status === 'completed' || status === 'success') {
    return {
      total,
      completed: total,
      failed: 0,
      percentage: 100,
      status: 'completed',
    };
  }

  // If failed, show as error
  if (status === 'failed') {
    return {
      total,
      completed: 0,
      failed: total,
      percentage: 0,
      status: 'error',
    };
  }

  // For pending/processing, estimate progress
  // When processing, we can check how many result URLs we have
  const resultUrls = batchJob.result_image_urls || [];
  const completed = resultUrls.length;

  return {
    total,
    completed: Math.min(completed, total),
    failed: 0,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    status: status as BatchStatus,
  };
}

/**
 * Pause batch processing
 */
export async function pauseBatch(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to pause batch');
  }
}

/**
 * Resume batch processing
 */
export async function resumeBatch(jobId: string): Promise<void> {
  await getBatchProgress(jobId);
}

/**
 * Cancel batch processing
 */
export async function cancelBatch(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to cancel batch');
  }
}

/**
 * Get batch statistics
 */
export async function getBatchStats(): Promise<BatchStats> {
  const response = await fetch(`${API_BASE}/jobs?limit=200`);
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to load stats');
  }
  const jobs = data.data?.jobs || [];
  const total = jobs.length;
  const completed = jobs.filter((j: any) => j.status === 'completed' || j.status === 'success').length;
  const failed = jobs.filter((j: any) => j.status === 'failed').length;
  const pending = jobs.filter((j: any) => j.status === 'pending').length;
  const processing = jobs.filter((j: any) => j.status === 'processing').length;
  return { total, completed, failed, pending, processing };
}

// ========================================
// Settings
// ========================================

/**
 * Get studio settings
 */
export async function getSettings(): Promise<StudioSettings> {
  const response = await fetch(`${API_BASE}/settings`);
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to load settings');
  }
  const raw = data.data || {};
  return {
    imageSize: `${raw.target_width || 1536}x${raw.target_height || 1536}` as StudioSettings['imageSize'],
    imageFormat: raw.image_format || 'png',
    quality: raw.quality || 90,
    preserveOriginal: Boolean(raw.preserve_original),
  };
}

/**
 * Update studio settings
 */
export async function updateSettings(settings: Partial<StudioSettings>): Promise<StudioSettings> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_format: settings.imageFormat,
      quality: settings.quality,
      preserve_original: settings.preserveOriginal,
    }),
  });
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to update settings');
  }
  return getSettings();
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

  const response = await fetch('/api/ai-playground/uploads', {
    method: 'POST',
    body: formData,
  });
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to upload images');
  }
  return { uploaded: data.data?.length || 0, failed: 0 };
}

/**
 * Upload a single reference image
 */
export async function uploadReferenceImage(file: File): Promise<{ url: string; id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/ai-playground/uploads`, {
    method: 'POST',
    body: formData,
  });
  const data = await handleResponse<any>(response);
  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to upload reference image');
  }
  const item = data.data?.[0];
  return { url: item?.url || '', id: item?.id || '' };
}

// ========================================
// Prompt Groups
// ========================================

/**
 * Get user's active prompt group
 */
export async function getActivePromptGroup(): Promise<any> {
  const response = await fetch(`${API_BASE}/settings`);
  const data = await handleResponse<{ code: number; data: any }>(response);
  if (data.code !== 0) {
    return null;
  }
  const groupId = data.data?.active_prompt_group_id;
  if (!groupId) return null;
  const groupRes = await fetch(`${API_BASE}/prompt-groups`);
  const groupData = await handleResponse<{ code: number; data: { groups: any[] } }>(groupRes);
  return (groupData.data.groups || []).find((g) => g.id === groupId) || null;
}

/**
 * Get all prompt groups
 */
export async function getPromptGroups(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/prompt-groups`);
  const data = await handleResponse<{ code: number; data: { groups: any[] } }>(response);
  return data.data.groups;
}

/**
 * Update user's active prompt group
 */
export async function setActivePromptGroup(groupId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/prompt-groups/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: groupId }),
  });
  if (!response.ok) {
    throw new Error('Failed to set active prompt group');
  }
}
