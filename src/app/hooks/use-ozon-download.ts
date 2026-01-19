/**
 * Ozon download functionality Hook
 */
'use client';

import { useState, useCallback } from 'react';
import { ozonApi } from '@/lib/api/ozon';
import type { OzonDownloadResult } from '@/lib/api/ozon';

export interface DownloadInput {
  credentialId: string;
  articles: string[];
  field: 'offer_id' | 'sku' | 'vendor_code';
}

export interface DownloadResult {
  success: boolean;
  task?: any;
  result?: OzonDownloadResult;
  error?: string;
}

export function useOzonDownload() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OzonDownloadResult | null>(null);

  /**
   * Execute download task
   */
  const download = useCallback(async (input: DownloadInput): Promise<DownloadResult | null> => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ozon/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const data = await response.json();

      if (data.code === 0) {
        // Task created successfully, processing in background
        return { success: true, task: data.data };
      } else {
        throw new Error(data.message || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Poll task status until completion
   */
  const pollTask = useCallback(
    async (taskId: string, interval = 2000, maxAttempts = 60) => {
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const response = await fetch(`/api/ozon/tasks/${taskId}`);
          if (!response.ok) {
            throw new Error('Failed to get task status');
          }

          const data = await response.json();
          if (data.code === 0) {
            const task = data.data;

            if (task.status === 'completed' && task.result) {
              setResult(task.result);
              return { success: true, task, result: task.result };
            }

            if (task.status === 'failed') {
              throw new Error(task.errorMessage || 'Task failed');
            }

            // Still processing, wait and poll again
            await new Promise((resolve) => setTimeout(resolve, interval));
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      }

      setError('Task timeout');
      return { success: false, error: 'Task timeout' };
    },
    []
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    download,
    pollTask,
    isLoading,
    error,
    result,
    reset,
  };
}
