/**
 * AI Playground API client
 * Interfaces with Python backend for AI image processing
 */

import { envConfigs } from '@/config';

// ========================================
// Types
// ========================================

export type AiJobType = 'background_replacement' | 'batch_optimization' | 'image_enhancement';
export type AiJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AiQuality = 'low' | 'standard' | 'high';
export type AiFormat = 'png' | 'jpg' | 'webp';
export type AiWorkflowState = 'pending' | 'approved' | 'archived';

export interface BackgroundReplacementConfig {
  backgroundPrompt: string;
  negativePrompt?: string;
  quality: AiQuality;
  format: AiFormat;
  seed?: number;
}

export interface BatchOptimizationConfig {
  quality: AiQuality;
  format: AiFormat;
  maxSize?: number;
  maintainAspect: boolean;
}

export interface ImageEnhancementConfig {
  enhancementLevel: number; // 1-10
  sharpen: boolean;
  denoise: boolean;
  upscale?: boolean; // 2x, 4x
}

export type AiJobConfig =
  | BackgroundReplacementConfig
  | BatchOptimizationConfig
  | ImageEnhancementConfig;

export interface AiJobRequest {
  job_id: string;
  user_id: string;
  type: AiJobType;
  config: AiJobConfig;
  source_image_urls: string[];
}

export interface AiJobProgress {
  job_id: string;
  status: AiJobStatus;
  progress: number; // 0-100
  processed: number;
  total: number;
  current_image?: string;
  message?: string;
}

export interface AiJobResult {
  job_id: string;
  status: AiJobStatus;
  result_image_urls: string[];
  source_image_urls: string[];
  processing_time_ms: number;
  metadata: Array<{
    source_url: string;
    result_url: string;
    dimensions: { width: number; height: number };
    size_bytes: number;
    processing_time_ms: number;
  }>;
}

export interface AiJobResponse {
  success: boolean;
  data?: AiJobResult;
  error?: string;
  execution_time_ms?: number;
}

export interface AiErrorResponse {
  success: false;
  error: string;
  detail?: string;
  code?: string;
}

export interface AiSSEEvent {
  event: 'progress' | 'completed' | 'error';
  data: AiJobProgress | AiJobResult | { error: string };
}

// ========================================
// API Client
// ========================================

const PYTHON_API_URL = envConfigs.python_api_url || 'http://localhost:8000';
const PYTHON_API_KEY = envConfigs.python_api_key || '';

if (!PYTHON_API_KEY) {
  console.warn('WARNING: PYTHON_API_KEY is not set in environment variables');
}

export class AiPlaygroundApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || PYTHON_API_URL;
    this.apiKey = apiKey || PYTHON_API_KEY;
  }

  /**
   * Submit background replacement job
   */
  async submitBackgroundReplacement(
    jobId: string,
    userId: string,
    sourceImageUrls: string[],
    config: BackgroundReplacementConfig
  ): Promise<AiJobResponse> {
    return this.submitJob({
      job_id: jobId,
      user_id: userId,
      type: 'background_replacement',
      config,
      source_image_urls: sourceImageUrls,
    });
  }

  /**
   * Submit batch optimization job
   */
  async submitBatchOptimization(
    jobId: string,
    userId: string,
    sourceImageUrls: string[],
    config: BatchOptimizationConfig
  ): Promise<AiJobResponse> {
    return this.submitJob({
      job_id: jobId,
      user_id: userId,
      type: 'batch_optimization',
      config,
      source_image_urls: sourceImageUrls,
    });
  }

  /**
   * Submit image enhancement job
   */
  async submitImageEnhancement(
    jobId: string,
    userId: string,
    sourceImageUrls: string[],
    config: ImageEnhancementConfig
  ): Promise<AiJobResponse> {
    return this.submitJob({
      job_id: jobId,
      user_id: userId,
      type: 'image_enhancement',
      config,
      source_image_urls: sourceImageUrls,
    });
  }

  /**
   * Generic job submission
   */
  async submitJob(request: AiJobRequest): Promise<AiJobResponse> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/job`, {
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
      console.error('AI Playground job submission error:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<AiJobProgress | null> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/job/${jobId}/status`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`Job status check failed: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Job status error:', error);
      return null;
    }
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string): Promise<AiJobResult | null> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/job/${jobId}/result`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Job result error:', error);
      return null;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/job/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Job cancel error:', error);
      return false;
    }
  }

  /**
   * Subscribe to job progress via Server-Sent Events
   */
  subscribeToJobProgress(
    jobId: string,
    onProgress: (progress: AiJobProgress) => void,
    onComplete: (result: AiJobResult) => void,
    onError: (error: string) => void
  ): () => void {
    if (!this.apiKey) {
      onError('PYTHON_API_KEY is not configured');
      return () => {};
    }

    const eventSource = new EventSource(
      `${this.baseUrl}/api/v1/ai/job/${jobId}/stream?api_key=${this.apiKey}`
    );

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data) as AiJobProgress;
        onProgress(data);
      } catch (error) {
        console.error('Failed to parse progress event:', error);
      }
    });

    eventSource.addEventListener('completed', (event) => {
      try {
        const data = JSON.parse(event.data) as AiJobResult;
        onComplete(data);
        eventSource.close();
      } catch (error) {
        console.error('Failed to parse completed event:', error);
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      try {
        const data = JSON.parse(event.data) as { error: string };
        onError(data.error);
      } catch {
        onError('Unknown error occurred');
      }
      eventSource.close();
    });

    eventSource.onerror = () => {
      onError('Connection lost');
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  /**
   * Generate download URL for image pair
   */
  async generateDownloadUrl(
    imagePairId: string,
    sourceUrl: string,
    resultUrl: string
  ): Promise<{ download_url: string; expires_at: string } | null> {
    if (!this.apiKey) {
      throw new Error('PYTHON_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ai/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          image_pair_id: imagePairId,
          source_url: sourceUrl,
          result_url: resultUrl,
        }),
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Generate download URL error:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; ai_service: 'available' | 'unavailable' } | null> {
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
   * Check if AI service is available
   */
  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck();
    return health?.ai_service === 'available';
  }
}

// Singleton export
export const aiPlaygroundApi = new AiPlaygroundApiClient();

// ========================================
// Constants
// ========================================

export const AI_JOB_TYPES: { value: AiJobType; label: string; description: string }[] = [
  {
    value: 'background_replacement',
    label: 'Background Replacement',
    description: 'Replace image backgrounds with AI-generated scenes',
  },
  {
    value: 'batch_optimization',
    label: 'Batch Optimization',
    description: 'Optimize multiple images for web use',
  },
  {
    value: 'image_enhancement',
    label: 'Image Enhancement',
    description: 'Enhance image quality with AI upscaling and denoising',
  },
];

export const AI_QUALITY_OPTIONS: { value: AiQuality; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Fast processing, smaller file size' },
  { value: 'standard', label: 'Standard', description: 'Balanced quality and speed' },
  { value: 'high', label: 'High', description: 'Best quality, slower processing' },
];

export const AI_FORMAT_OPTIONS: { value: AiFormat; label: string; extension: string }[] = [
  { value: 'png', label: 'PNG', extension: '.png' },
  { value: 'jpg', label: 'JPEG', extension: '.jpg' },
  { value: 'webp', label: 'WebP', extension: '.webp' },
];

export const AI_WORKFLOW_STATES: { value: AiWorkflowState; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'archived', label: 'Archived', color: 'gray' },
];

// Default configs
export const DEFAULT_BACKGROUND_REPLACEMENT_CONFIG: BackgroundReplacementConfig = {
  backgroundPrompt: '',
  negativePrompt: '',
  quality: 'standard',
  format: 'png',
};

export const DEFAULT_BATCH_OPTIMIZATION_CONFIG: BatchOptimizationConfig = {
  quality: 'standard',
  format: 'webp',
  maxSize: 1920,
  maintainAspect: true,
};

export const DEFAULT_IMAGE_ENHANCEMENT_CONFIG: ImageEnhancementConfig = {
  enhancementLevel: 5,
  sharpen: true,
  denoise: true,
  upscale: false,
};
