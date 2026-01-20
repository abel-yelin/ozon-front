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

// Mock data for development when backend is unavailable
const mockSKUs: SKU[] = [
  {
    id: '1',
    article: '052-01-1',
    thumbnail: '/placeholder-image.jpg',
    status: 'done',
    isMainImage: true,
    isApproved: true,
  },
  {
    id: '2',
    article: '052-01-2',
    thumbnail: '/placeholder-image.jpg',
    status: 'not_generated',
    isMainImage: false,
    isApproved: false,
  },
  {
    id: '3',
    article: '052-01-3',
    thumbnail: '/placeholder-image.jpg',
    status: 'main_generated',
    isMainImage: false,
    isApproved: false,
  },
];

const mockImagePairs: ImagePair[] = [
  {
    id: 'pair-1',
    inputImage: {
      id: 'img-1',
      url: 'https://via.placeholder.com/400',
      filename: 'input-1.jpg',
    },
    outputImage: {
      id: 'img-2',
      url: 'https://via.placeholder.com/400/00FF00/000000?text=Output',
      filename: 'output-1.jpg',
    },
    status: 'completed',
    processingTime: 1500,
  },
];

// ========================================
// Helper functions
// ========================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    // If backend is not available, return mock data in development
    if (response.status === 404) {
      console.warn('Backend not available, using mock data');
      throw new Error('MOCK_DATA');
    }
    throw new Error(error || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchWithMock<T>(url: string, options?: RequestInit, mockData?: T): Promise<T> {
  try {
    const response = await fetch(url, options);
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'MOCK_DATA' && mockData) {
      return mockData;
    }
    throw error;
  }
}

// ========================================
// SKU Management
// ========================================

/**
 * Fetch list of SKUs with optional filters
 */
export async function fetchSKUs(filters?: SKUFilters): Promise<SKU[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  if (filters?.searchQuery) {
    params.append('search', filters.searchQuery);
  }
  if (filters?.onlyMainImages) {
    params.append('mainOnly', 'true');
  }
  if (filters?.onlyApproved) {
    params.append('approvedOnly', 'true');
  }

  return fetchWithMock<SKU[]>(
    `${API_BASE}/skus?${params.toString()}`,
    undefined,
    mockSKUs
  );
}

/**
 * Fetch a single SKU by ID
 */
export async function fetchSKU(id: string): Promise<SKU> {
  const sku = mockSKUs.find(s => s.id === id);
  if (!sku) {
    throw new Error('SKU not found');
  }
  return fetchWithMock<SKU>(
    `${API_BASE}/skus/${id}`,
    undefined,
    sku
  );
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
 */
export async function fetchImagePairs(skuId: string): Promise<ImagePair[]> {
  return fetchWithMock<ImagePair[]>(
    `${API_BASE}/skus/${skuId}/images`,
    undefined,
    mockImagePairs
  );
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
  const mockStats: BatchStats = {
    total: 10,
    completed: 5,
    failed: 1,
    pending: 4,
  };
  return fetchWithMock<BatchStats>(
    `${API_BASE}/batch/stats`,
    undefined,
    mockStats
  );
}

// ========================================
// Settings
// ========================================

/**
 * Get studio settings
 */
export async function getSettings(): Promise<StudioSettings> {
  const mockSettings: StudioSettings = {
    imageSize: '1536x1536',
    imageFormat: 'png',
    quality: 90,
    preserveOriginal: true,
  };
  return fetchWithMock<StudioSettings>(
    `${API_BASE}/settings`,
    undefined,
    mockSettings
  );
}

/**
 * Update studio settings
 */
export async function updateSettings(settings: Partial<StudioSettings>): Promise<StudioSettings> {
  const mockSettings: StudioSettings = {
    imageSize: '1536x1536',
    imageFormat: 'png',
    quality: 90,
    preserveOriginal: true,
    ...settings,
  };
  return fetchWithMock<StudioSettings>(
    `${API_BASE}/settings`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    },
    mockSettings
  );
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
