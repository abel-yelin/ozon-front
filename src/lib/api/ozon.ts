/**
 * Ozon API client
 * Interfaces with Python backend for Ozon image downloads
 */

import { envConfigs } from '@/config';

export interface OzonCredential {
  client_id: string;
  api_key: string;
}

export interface OzonDownloadRequest {
  credential: OzonCredential;
  articles: string[];
  field?: 'offer_id' | 'sku' | 'vendor_code';
  user_id: string;
  download_images?: boolean; // If false, only return metadata without downloading images
}

export interface OzonDownloadItem {
  article: string;
  product_id?: number;
  status: 'success' | 'failed';
  total_images: number;
  success_images: number;
  failed_images: number;
  urls: string[];
  error?: string;
}

export interface OzonDownloadResult {
  total_articles: number;
  processed: number;
  total_images: number;
  success_images: number;
  failed_images: number;
  items: OzonDownloadItem[];
}

export interface OzonDownloadResponse {
  success: boolean;
  data?: OzonDownloadResult;
  error?: string;
  execution_time_ms?: number;
}

export interface OzonHealthResponse {
  status: string;
  version: string;
  plugins: Array<{
    name: string;
    display_name: string;
    category: string;
    enabled: boolean;
    healthy: boolean;
  }>;
}

// Use python_service_url for consistency
const PYTHON_API_URL = envConfigs.python_service_url || envConfigs.python_api_url || 'http://localhost:8000';
const PYTHON_API_KEY = envConfigs.python_service_api_key || envConfigs.python_api_key || '';

if (!PYTHON_API_KEY) {
  console.warn('WARNING: PYTHON_API_KEY is not set in environment variables');
}

export class OzonApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || PYTHON_API_URL;
    this.apiKey = apiKey || PYTHON_API_KEY;
  }

  /**
   * Call backend download API
   */
  async downloadImages(request: OzonDownloadRequest): Promise<OzonDownloadResponse> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ozon/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ozon download API error:', error);
      throw error;
    }
  }

  /**
   * Get image URLs from Ozon API without downloading images
   * Used for browser-based upload mode
   */
  async getImageUrls(request: Omit<OzonDownloadRequest, 'download_images'>): Promise<OzonDownloadResult> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ozon/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          ...request,
          download_images: false, // Only fetch metadata, don't download images
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data: OzonDownloadResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to get image URLs');
      }

      return data.data;
    } catch (error) {
      console.error('Ozon get image URLs API error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<OzonHealthResponse | null> {
    if (!this.apiKey) {
      console.warn('PYTHON_API_KEY is not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`Health check failed: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return null;
    }
  }

  /**
   * Check if backend is healthy
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.healthCheck();
    return health?.status === 'healthy';
  }

  /**
   * Push processed images to Ozon product
   */
  async pushImages(request: {
    credential: OzonCredential;
    product_id: number;
    images: string[];
  }): Promise<{
    success: boolean;
    data?: {
      product_id: number;
      updated: {
        images: number;
        images360: number;
        color_image: boolean;
      };
      current_images: string[];
    };
    error?: string;
    errors?: Array<{
      field: string;
      index?: number;
      url?: string;
      reason: string;
    }>;
  }> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ozon/push-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ozon push images API error:', error);
      throw error;
    }
  }
}

// Singleton export
export const ozonApi = new OzonApiClient();
