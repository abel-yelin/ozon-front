/**
 * ImageStudio React Context
 * Manages global state for the ImageStudio page
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type {
  SKU,
  ImagePair,
  StudioSettings,
  BatchProgress,
  SKUFilters,
  RegenOptions,
  ModalState,
  ModalType,
  BatchStats,
} from '@/shared/blocks/image-studio/types';
import * as api from '@/lib/api/image-studio';

// ========================================
// Context types
// ========================================

interface ImageStudioContextValue {
  // State
  skus: SKU[];
  selectedSKUIds: Set<string>;
  currentSKU: SKU | null;
  currentImagePairs: ImagePair[];
  settings: StudioSettings;
  filters: SKUFilters;
  modal: ModalState;
  batchProgress: BatchProgress | null;
  batchStats: BatchStats | null;
  isLoading: boolean;
  error: string | null;
  activePromptGroup: any;

  // Actions
  loadSKUs: () => Promise<void>;
  selectSKU: (id: string) => void;
  selectMultipleSKUs: (ids: string[]) => void;
  deselectSKU: (id: string) => void;
  clearSelection: () => void;
  setCurrentSKU: (sku: SKU | null) => void;
  updateFilters: (filters: Partial<SKUFilters>) => void;
  updateSettings: (settings: Partial<StudioSettings>) => Promise<void>;
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  regenerateImage: (pairId: string, options: RegenOptions) => Promise<void>;
  startBatch: (skuIds?: string[]) => Promise<void>;
  pauseBatch: () => Promise<void>;
  resumeBatch: () => Promise<void>;
  cancelBatch: () => Promise<void>;
  downloadImage: (pairId: string, format: 'png' | 'jpg' | 'webp') => Promise<void>;
  downloadBatch: (format: 'png' | 'jpg' | 'webp') => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
  refreshCurrentSKU: () => Promise<void>;
}

const ImageStudioContext = createContext<ImageStudioContextValue | undefined>(undefined);

// ========================================
// Provider
// ========================================

interface ImageStudioProviderProps {
  children: React.ReactNode;
}

export function ImageStudioProvider({ children }: ImageStudioProviderProps) {
  // State
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [selectedSKUIds, setSelectedSKUIds] = useState<Set<string>>(new Set());
  const [currentSKU, setCurrentSKU] = useState<SKU | null>(null);
  const [currentImagePairs, setCurrentImagePairs] = useState<ImagePair[]>([]);
  const [settings, setSettings] = useState<StudioSettings>({
    imageSize: '1536x1536',
    imageFormat: 'png',
    quality: 90,
    preserveOriginal: true,
  });
  const [filters, setFilters] = useState<SKUFilters>({});
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePromptGroup, setActivePromptGroup] = useState<any>(null);

  // Refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const singleJobPollRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================
  // Effects
  // ========================================

  // Load settings, prompt group, and SKUs on mount
  useEffect(() => {
    // NEW: Single consolidated request (eliminates waterfall)
    api.getSettings()
      .then(data => {
        setSettings(data);
        // Active group info is now inline in settings
        setActivePromptGroup({
          id: data.active_prompt_group_id || '',
          name: data.active_prompt_group_name || '',
        });
      })
      .catch(console.error);

    loadBatchStats();
    loadSKUs(); // Load SKUs on mount
  }, []);

  // Poll batch progress when processing
  useEffect(() => {
    if (batchProgress?.status === 'processing' && currentJobIdRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progress = await api.getBatchProgress(currentJobIdRef.current);
          setBatchProgress(progress);
          if (progress.status === 'completed' || progress.status === 'error') {
            clearInterval(pollIntervalRef.current!);
            await loadSKUs();
            await loadBatchStats();
          }
        } catch (err) {
          console.error('Failed to poll batch progress:', err);
        }
      }, 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [batchProgress?.status]);

  useEffect(() => {
    return () => {
      if (singleJobPollRef.current) {
        clearInterval(singleJobPollRef.current);
        singleJobPollRef.current = null;
      }
    };
  }, []);

  // ========================================
  // Actions
  // ========================================

  const loadSKUs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fetchSKUs(filters);
      setSKUs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SKUs');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const selectSKU = useCallback((id: string) => {
    setSelectedSKUIds(prev => new Set(prev).add(id));
  }, []);

  const selectMultipleSKUs = useCallback((ids: string[]) => {
    setSelectedSKUIds(new Set(ids));
  }, []);

  const deselectSKU = useCallback((id: string) => {
    setSelectedSKUIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSKUIds(new Set());
  }, []);

  const loadCurrentSKUImagePairs = useCallback(async (sku: SKU) => {
    try {
      const pairs = await api.fetchImagePairs(sku.id);
      setCurrentImagePairs(pairs);
    } catch (err) {
      console.error('Failed to load image pairs:', err);
    }
  }, []);

  const stopSingleJobPoll = useCallback(() => {
    if (singleJobPollRef.current) {
      clearInterval(singleJobPollRef.current);
      singleJobPollRef.current = null;
    }
  }, []);

  const pollSingleJob = useCallback(async (jobId: string, skuId: string) => {
    stopSingleJobPoll();
    let attempts = 0;
    const maxAttempts = 180;

    singleJobPollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const job = await api.getJobStatus(jobId);
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          stopSingleJobPoll();
          if (currentSKU && currentSKU.id === skuId) {
            await loadCurrentSKUImagePairs(currentSKU);
          }
          await loadSKUs();
        }
      } catch (err) {
        console.error('[ImageStudio] Poll job status failed', err);
        if (attempts >= maxAttempts) {
          stopSingleJobPoll();
        }
      }
    }, 2000);
  }, [currentSKU, loadCurrentSKUImagePairs, loadSKUs, stopSingleJobPoll]);

  const handleSetCurrentSKU = useCallback(async (sku: SKU | null) => {
    setCurrentSKU(sku);
    if (sku) {
      await loadCurrentSKUImagePairs(sku);
    } else {
      setCurrentImagePairs([]);
    }
  }, [loadCurrentSKUImagePairs]);

  const updateFilters = useCallback((newFilters: Partial<SKUFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<StudioSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  }, []);

  const openModal = useCallback((type: ModalType, data?: any) => {
    setModal({ type, data });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ type: null });
  }, []);

  const regenerateImage = useCallback(async (pairId: string, options: RegenOptions) => {
    if (!currentSKU) return;
    setIsLoading(true);
    try {
      console.info('[ImageStudio] Regenerate start', { sku: currentSKU.id, pairId });
      const { jobId } = await api.regenerateImage(currentSKU.id, pairId, options);
      console.info('[ImageStudio] Regenerate completed', { sku: currentSKU.id, pairId });
      if (jobId) {
        pollSingleJob(jobId, currentSKU.id);
      } else {
        await loadCurrentSKUImagePairs(currentSKU);
      }
    } catch (err) {
      console.error('[ImageStudio] Regenerate error', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate image');
    } finally {
      setIsLoading(false);
    }
  }, [currentSKU, loadCurrentSKUImagePairs]);

  const startBatch = useCallback(async (skuIds?: string[]) => {
    const ids = skuIds || Array.from(selectedSKUIds);
    if (ids.length === 0) return;

    setIsLoading(true);
    try {
      const job = await api.startBatch(ids, settings);
      currentJobIdRef.current = job.id;
      setBatchProgress({
        total: ids.length,
        completed: 0,
        failed: 0,
        percentage: 0,
        status: 'processing',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start batch');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSKUIds, settings]);

  const pauseBatch = useCallback(async () => {
    if (!currentJobIdRef.current) return;
    await api.pauseBatch(currentJobIdRef.current);
    setBatchProgress(prev => prev ? { ...prev, status: 'paused' } : null);
  }, []);

  const resumeBatch = useCallback(async () => {
    if (!currentJobIdRef.current) return;
    await api.resumeBatch(currentJobIdRef.current);
    setBatchProgress(prev => prev ? { ...prev, status: 'processing' } : null);
  }, []);

  const cancelBatch = useCallback(async () => {
    if (!currentJobIdRef.current) return;
    await api.cancelBatch(currentJobIdRef.current);
    currentJobIdRef.current = null;
    setBatchProgress(null);
  }, []);

  const downloadImage = useCallback(async (pairId: string, format: 'png' | 'jpg' | 'webp') => {
    if (!currentSKU) return;
    try {
      const blob = await api.downloadImage(currentSKU.id, pairId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSKU.article}-${pairId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download image');
    }
  }, [currentSKU]);

  const downloadBatch = useCallback(async (format: 'png' | 'jpg' | 'webp') => {
    const ids = Array.from(selectedSKUIds);
    if (ids.length === 0) return;

    try {
      const blob = await api.downloadBatch(ids, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download batch');
    }
  }, [selectedSKUIds]);

  const uploadImages = useCallback(async (files: File[]) => {
    setIsLoading(true);
    try {
      await api.uploadImages(files);
      await loadSKUs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setIsLoading(false);
    }
  }, [loadSKUs]);

  const loadBatchStats = useCallback(async () => {
    try {
      const stats = await api.getBatchStats();
      setBatchStats(stats);
    } catch (err) {
      console.error('Failed to load batch stats:', err);
    }
  }, []);

  const refreshCurrentSKU = useCallback(async () => {
    if (!currentSKU) return;
    await loadCurrentSKUImagePairs(currentSKU);
    const updatedSKU = await api.fetchSKU(currentSKU.id);
    setCurrentSKU(updatedSKU);
  }, [currentSKU, loadCurrentSKUImagePairs]);

  // ========================================
  // Context value
  // ========================================

  const value: ImageStudioContextValue = {
    skus,
    selectedSKUIds,
    currentSKU,
    currentImagePairs,
    settings,
    filters,
    modal,
    batchProgress,
    batchStats,
    isLoading,
    error,
    activePromptGroup,
    loadSKUs,
    selectSKU,
    selectMultipleSKUs,
    deselectSKU,
    clearSelection,
    setCurrentSKU: handleSetCurrentSKU,
    updateFilters,
    updateSettings,
    openModal,
    closeModal,
    regenerateImage,
    startBatch,
    pauseBatch,
    resumeBatch,
    cancelBatch,
    downloadImage,
    downloadBatch,
    uploadImages,
    refreshCurrentSKU,
  };

  return (
    <ImageStudioContext.Provider value={value}>
      {children}
    </ImageStudioContext.Provider>
  );
}

// ========================================
// Hook
// ========================================

export function useImageStudio(): ImageStudioContextValue {
  const context = useContext(ImageStudioContext);
  if (!context) {
    throw new Error('useImageStudio must be used within ImageStudioProvider');
  }
  return context;
}
