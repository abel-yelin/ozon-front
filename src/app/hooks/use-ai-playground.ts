'use client';

import { useCallback, useEffect, useState } from 'react';

import { aiPlaygroundApi } from '@/lib/api/ai-playground';
import { useAiPlayground } from '@/shared/contexts/ai-playground';
import type {
  AiJobProgress,
  AiJobResult,
  BackgroundReplacementConfig,
  BatchOptimizationConfig,
  ImageEnhancementConfig,
} from '@/lib/api/ai-playground';

// ========================================
// useAiJobSubmit - Submit AI jobs
// ========================================

export interface UseAiJobSubmitOptions {
  onSuccess?: (jobId: string) => void;
  onError?: (error: string) => void;
}

export function useAiJobSubmit(options?: UseAiJobSubmitOptions) {
  const { uploadedImages, jobConfig, setCurrentJobId, setJobProgress, clearUploadedImages } =
    useAiPlayground();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitJob = useCallback(async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      options?.onError?.('Please upload at least one image');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit to API
      const response = await fetch('/api/ai-playground/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: jobConfig.type,
          config: getConfigByType(jobConfig.type),
          sourceImageUrls: uploadedImages.map((img) => img.url),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit job');
      }

      const data = await response.json();

      if (data.code === 0) {
        const jobId = data.data.id;
        setCurrentJobId(jobId);
        clearUploadedImages();
        options?.onSuccess?.(jobId);
      } else {
        throw new Error(data.message || 'Failed to submit job');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit job';
      setError(errorMessage);
      options?.onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [uploadedImages, jobConfig, setCurrentJobId, setJobProgress, clearUploadedImages, options]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/ai-playground/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  }, []);

  return {
    submitJob,
    cancelJob,
    isSubmitting,
    error,
    canSubmit: uploadedImages.length > 0,
  };
}

// ========================================
// useAiJobProgress - Track job progress with SSE
// ========================================

export function useAiJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<AiJobProgress | null>(null);
  const [result, setResult] = useState<AiJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const cleanup = aiPlaygroundApi.subscribeToJobProgress(
      jobId,
      (progressData: AiJobProgress) => {
        setProgress(progressData);
      },
      (resultData: AiJobResult) => {
        setResult(resultData);
        setProgress({
          job_id: jobId,
          status: 'completed',
          progress: 100,
          processed: resultData.source_image_urls.length,
          total: resultData.source_image_urls.length,
        });
      },
      (errorMessage: string) => {
        setError(errorMessage);
      }
    );

    return cleanup;
  }, [jobId]);

  return { progress, result, error };
}

// ========================================
// useAiImageUpload - Handle image uploads
// ========================================

export interface UseAiImageUploadOptions {
  maxFiles?: number;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export function useAiImageUpload(options?: UseAiImageUploadOptions) {
  const { addUploadedImages, uploadedImages } = useAiPlayground();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxFiles = options?.maxFiles || 50;
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB
  const allowedTypes = options?.allowedTypes || ['image/png', 'image/jpeg', 'image/webp'];

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);

      const fileArray = Array.from(files);

      // Check max files
      if (uploadedImages.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate files
      const validFiles: File[] = [];
      for (const file of fileArray) {
        if (!allowedTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.type}`);
          return;
        }
        if (file.size > maxSize) {
          setError(`File too large: ${file.name}`);
          return;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        validFiles.forEach((file) => {
          formData.append('files', file, file.name);
        });

        const response = await fetch('/api/ai-playground/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload images');
        }

        const data = await response.json();
        if (data.code !== 0) {
          throw new Error(data.message || 'Failed to upload images');
        }

        const uploaded = (data.data || []).map((item: any) => ({
          id: item.id,
          url: item.url,
          name: item.name,
          size: item.size,
        }));

        addUploadedImages(uploaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [uploadedImages.length, maxFiles, maxSize, allowedTypes, addUploadedImages]
  );

  return {
    uploadFiles,
    isUploading,
    error,
    canUpload: uploadedImages.length < maxFiles,
    remainingSlots: maxFiles - uploadedImages.length,
  };
}

// ========================================
// useAiJobs - Fetch user's AI jobs
// ========================================

export function useAiJobs(options?: { status?: string; limit?: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/ai-playground/jobs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();

      if (data.code === 0) {
        setJobs(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch jobs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options?.status, options?.limit]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch: fetchJobs };
}

// ========================================
// useAiImagePairs - Fetch image pairs for review
// ========================================

export function useAiImagePairs(options?: {
  workflowStateId?: string;
  jobId?: string;
  approved?: boolean;
  archived?: boolean;
  limit?: number;
  enabled?: boolean;
}) {
  const [imagePairs, setImagePairs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImagePairs = useCallback(async () => {
    const enabled = options?.enabled ?? true;
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.workflowStateId) params.append('workflowStateId', options.workflowStateId);
      if (options?.jobId) params.append('jobId', options.jobId);
      if (options?.approved !== undefined) params.append('approved', options.approved.toString());
      if (options?.archived !== undefined) params.append('archived', options.archived.toString());
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/ai-playground/image-pairs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch image pairs');
      }

      const data = await response.json();

      if (data.code === 0) {
        setImagePairs(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch image pairs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch image pairs';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchImagePairs();
  }, [fetchImagePairs]);

  const updateImagePair = useCallback(async (pairId: string, updates: any) => {
    try {
      const response = await fetch(`/api/ai-playground/image-pairs/${pairId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update image pair');
      }

      await fetchImagePairs();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image pair');
      return false;
    }
  }, [fetchImagePairs]);

  return {
    imagePairs,
    isLoading,
    error,
    refetch: fetchImagePairs,
    updateImagePair,
  };
}

// ========================================
// useAiUserSettings - Manage user settings
// ========================================

export function useAiUserSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-playground/settings');

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();

      if (data.code === 0) {
        setSettings(data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Record<string, any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-playground/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();

      if (data.code === 0) {
        setSettings(data.data);
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { settings, updateSettings, isLoading, error, refetch: fetchSettings };
}

// ========================================
// Helper functions
// ========================================

function getConfigByType(
  type: string
): BackgroundReplacementConfig | BatchOptimizationConfig | ImageEnhancementConfig {
  switch (type) {
    case 'background_replacement':
      return {
        backgroundPrompt: '',
        negativePrompt: '',
        quality: 'standard',
        format: 'png',
      };
    case 'batch_optimization':
      return {
        quality: 'standard',
        format: 'webp',
        maxSize: 1920,
        maintainAspect: true,
      };
    case 'image_enhancement':
      return {
        enhancementLevel: 5,
        sharpen: true,
        denoise: true,
        upscale: false,
      };
    default:
      return {
        quality: 'standard',
        format: 'png',
      } as any;
  }
}
