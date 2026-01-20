# ImageStudio Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-screen AI-powered batch image processing page at `/dashboard/imagestudio` that replicates the UI/UX from `dev/ozon-backen/demo2/web`.

**Architecture:** Next.js App Router page with React Context for state management, custom full-screen layout (not using standard dashboard components), connecting to existing Python backend via API proxy.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui components, React Context API

---

## Phase 1: Foundation Setup

### Task 1: Create TypeScript types file

**Files:**
- Create: `src/shared/blocks/image-studio/types.ts`

**Step 1: Create the types file**

```typescript
// SKU (Stock Keeping Unit) - represents a product with images to process
export interface SKU {
  id: string;
  article: string;
  status: SKUStatus;
  isMainImage: boolean;
  isApproved: boolean;
  thumbnail: string;
  createdAt: string;
}

export type SKUStatus = 'not_generated' | 'main_generated' | 'done';

// Image pair for before/after comparison
export interface ImagePair {
  id: string;
  type: 'main' | 'secondary';
  original: Image;
  generated: Image | null;
  status: ImageStatus;
}

export type ImageStatus = 'pending' | 'processing' | 'done' | 'failed';

// Individual image
export interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  prompt?: string;
}

// Settings for the image studio
export interface StudioSettings {
  apiBase: string;
  apiKey: string;
  model: string;
  targetWidth: number;
  targetHeight: number;
  temperature: number;
  resumeMode: boolean;
  continuousView: boolean;
  showFinalPrompt: boolean;
  prompts: PromptGroup;
}

export interface PromptGroup {
  common: string;
  main: string;
  mainStyle: string;
  titleDetails: string;
  secondary: string;
  removeWatermark: string;
  removeLogo: string;
  textEdit: string;
  restructure: string;
  recolor: string;
  addMarkers: string;
  proPlan: string;
}

// Batch processing
export interface BatchStats {
  total: number;
  running: number;
  done: number;
  failed: number;
}

export interface BatchProgress {
  percent: number;
  stats: BatchStats;
  jobs: Job[];
}

export interface Job {
  id: string;
  skuId: string;
  status: ImageStatus;
  message?: string;
}

// Filter options for SKU list
export interface SKUFilters {
  status?: SKUStatus | 'all';
  searchQuery?: string;
  onlyMainImages?: boolean;
  onlyApproved?: boolean;
}

// Options for image regeneration
export interface RegenOptions {
  includeCommon: boolean;
  includeRole: boolean;
  includeTitleDetails: boolean;
  includePlan: boolean;
  includeStyle: boolean;
  optWatermark: boolean;
  optLogo: boolean;
  optTextEdit: boolean;
  optRestructure: boolean;
  optRecolor: boolean;
  optAddMarkers: boolean;
  strongConsistency: boolean;
  refFile?: File;
  extraPrompt?: string;
}

// Modal types
export type ModalType = 'image' | 'progress' | 'download' | 'settings' | 'opt-prompt' | null;
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/types.ts
git commit -m "feat(image-studio): add TypeScript types"
```

---

### Task 2: Create API client functions

**Files:**
- Create: `src/lib/api/image-studio.ts`

**Step 1: Create the API client file**

```typescript
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

// ========================================
// Helper functions
// ========================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

async function postRequest<T>(endpoint: string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

async function getRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  return handleResponse<T>(response);
}

async function deleteRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
  return handleResponse<T>(response);
}

// ========================================
// SKU Management
// ========================================

export async function getSKUs(filters?: SKUFilters): Promise<SKU[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.searchQuery) params.append('search', filters.searchQuery);
  if (filters?.onlyMainImages) params.append('onlyMain', 'true');
  if (filters?.onlyApproved) params.append('onlyApproved', 'true');

  const query = params.toString();
  return getRequest<SKU[]>(`/skus${query ? `?${query}` : ''}`);
}

export async function getSKU(id: string): Promise<SKU> {
  return getRequest<SKU>(`/skus/${id}`);
}

export async function archiveSKUs(ids: string[]): Promise<void> {
  return postRequest<void>('/skus/archive', { ids });
}

// ========================================
// Image Operations
// ========================================

export async function getImagePairs(skuId: string): Promise<ImagePair[]> {
  return getRequest<ImagePair[]>(`/pairs/${skuId}`);
}

export async function regenerateImage(
  imageId: string,
  options: RegenOptions
): Promise<{ imageUrl: string; jobId: string }> {
  return postRequest<{ imageUrl: string; jobId: string }>('/regenerate', {
    imageId,
    options,
  });
}

export async function optimizeImage(
  imageId: string,
  prompt: string
): Promise<{ imageUrl: string; jobId: string }> {
  return postRequest<{ imageUrl: string; jobId: string }>('/optimize', {
    imageId,
    prompt,
  });
}

// ========================================
// Batch Processing
// ========================================

export interface BatchOptions {
  skuIds: string[];
  doMain: boolean;
  doSecondary: boolean;
}

export async function startBatch(options: BatchOptions): Promise<{ jobId: string }> {
  return postRequest<{ jobId: string }>('/batch', options);
}

export async function cancelJob(jobId: string): Promise<void> {
  return deleteRequest<void>(`/batch/${jobId}`);
}

export async function getProgress(): Promise<BatchProgress> {
  return getRequest<BatchProgress>('/progress');
}

export async function getLogs(jobId?: string): Promise<string[]> {
  const query = jobId ? `?jobId=${jobId}` : '';
  return getRequest<string[]>(`/logs${query}`);
}

// ========================================
// Settings
// ========================================

export async function getSettings(): Promise<StudioSettings> {
  return getRequest<StudioSettings>('/settings');
}

export async function saveSettings(settings: StudioSettings): Promise<StudioSettings> {
  return postRequest<StudioSettings>('/settings', settings);
}

// ========================================
// Download & Upload
// ========================================

export interface DownloadOptions {
  shopId: string;
  articles: string[];
}

export async function startDownload(options: DownloadOptions): Promise<{ jobId: string }> {
  return postRequest<{ jobId: string }>('/download', options);
}

export async function uploadImages(files: File[]): Promise<{ uploaded: number; urls: string[] }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse<{ uploaded: number; urls: string[] }>(response);
}
```

**Step 2: Commit**

```bash
git add src/lib/api/image-studio.ts
git commit -m "feat(image-studio): add API client functions"
```

---

### Task 3: Create useInterval hook for polling

**Files:**
- Create: `src/shared/hooks/use-interval.ts`

**Step 1: Create the hook file**

```typescript
import { useEffect, useRef } from 'react';

/**
 * Interval hook that handles cleanup automatically
 * @param callback - Function to call on each interval
 * @param delay - Interval in milliseconds, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}
```

**Step 2: Commit**

```bash
git add src/shared/hooks/use-interval.ts
git commit -m "feat(image-studio): add useInterval hook for polling"
```

---

### Task 4: Create ImageStudio Context for state management

**Files:**
- Create: `src/shared/contexts/image-studio-context.tsx`

**Step 1: Create the context file**

```typescript
'use client';

import { createContext, ReactNode, useContext, useState, useCallback, useMemo } from 'react';

import type {
  SKU,
  ImagePair,
  StudioSettings,
  BatchStats,
  SKUStatus,
  ModalType,
  RegenOptions,
  Image,
} from '@/shared/blocks/image-studio/types';
import * as api from '@/lib/api/image-studio';

// ========================================
// Context State Interface
// ========================================

interface ImageStudioState {
  // UI State
  activeTab: 'processing' | 'history';
  proMode: boolean;
  selectedMode: 'continuous' | 'step-review';

  // SKU List State
  skuList: SKU[];
  selectedSKUs: Set<string>;
  filterStatus: SKUStatus | 'all';
  searchQuery: string;
  onlyMainImages: boolean;
  onlyApproved: boolean;

  // Current Selection
  currentSKU: SKU | null;
  imagePairs: ImagePair[];

  // Batch Processing
  batchProgress: number;
  batchStats: BatchStats;
  isBatchRunning: boolean;

  // Modal State
  activeModal: ModalType;
  modalImage: Image | null;

  // Settings
  settings: StudioSettings | null;

  // Loading states
  isLoadingSKUs: boolean;
  isLoadingPairs: boolean;
  error: string | null;
}

interface ImageStudioContextValue extends ImageStudioState {
  // Actions
  setActiveTab: (tab: 'processing' | 'history') => void;
  toggleProMode: () => void;
  setSelectedMode: (mode: 'continuous' | 'step-review') => void;

  // SKU actions
  loadSKUs: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: SKUStatus | 'all') => void;
  toggleOnlyMainImages: () => void;
  toggleOnlyApproved: () => void;
  selectSKU: (skuId: string) => void;
  toggleSKUSelection: (skuId: string) => void;
  selectAllSKUs: () => void;
  archiveSelectedSKUs: () => Promise<void>;

  // Image actions
  loadImagePairs: (skuId: string) => Promise<void>;
  refreshCurrentPairs: () => Promise<void>;

  // Modal actions
  openModal: (modal: ModalType, image?: Image) => void;
  closeModal: () => void;

  // Settings actions
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<StudioSettings>) => Promise<void>;

  // Batch actions
  startBatchProcessing: () => Promise<void>;
  stopBatchProcessing: () => Promise<void>;
}

// ========================================
// Default State
// ========================================

const defaultStats: BatchStats = {
  total: 0,
  running: 0,
  done: 0,
  failed: 0,
};

const initialState: ImageStudioState = {
  activeTab: 'processing',
  proMode: false,
  selectedMode: 'continuous',

  skuList: [],
  selectedSKUs: new Set<string>(),
  filterStatus: 'all',
  searchQuery: '',
  onlyMainImages: false,
  onlyApproved: false,

  currentSKU: null,
  imagePairs: [],

  batchProgress: 0,
  batchStats: defaultStats,
  isBatchRunning: false,

  activeModal: null,
  modalImage: null,

  settings: null,

  isLoadingSKUs: false,
  isLoadingPairs: false,
  error: null,
};

// ========================================
// Context
// ========================================

const ImageStudioContext = createContext<ImageStudioContextValue | undefined>(undefined);

export function ImageStudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImageStudioState>(initialState);

  // ========================================
  // UI Actions
  // ========================================

  const setActiveTab = useCallback((tab: 'processing' | 'history') => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleProMode = useCallback(() => {
    setState((prev) => ({ ...prev, proMode: !prev.proMode }));
  }, []);

  const setSelectedMode = useCallback((mode: 'continuous' | 'step-review') => {
    setState((prev) => ({ ...prev, selectedMode: mode }));
  }, []);

  // ========================================
  // SKU Actions
  // ========================================

  const loadSKUs = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingSKUs: true, error: null }));
    try {
      const skus = await api.getSKUs({
        status: state.filterStatus,
        searchQuery: state.searchQuery,
        onlyMainImages: state.onlyMainImages,
        onlyApproved: state.onlyApproved,
      });
      setState((prev) => ({ ...prev, skuList: skus, isLoadingSKUs: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load SKUs';
      setState((prev) => ({ ...prev, error: message, isLoadingSKUs: false }));
    }
  }, [state.filterStatus, state.searchQuery, state.onlyMainImages, state.onlyApproved]);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setFilterStatus = useCallback((status: SKUStatus | 'all') => {
    setState((prev) => ({ ...prev, filterStatus: status }));
  }, []);

  const toggleOnlyMainImages = useCallback(() => {
    setState((prev) => ({ ...prev, onlyMainImages: !prev.onlyMainImages }));
  }, []);

  const toggleOnlyApproved = useCallback(() => {
    setState((prev) => ({ ...prev, onlyApproved: !prev.onlyApproved }));
  }, []);

  const selectSKU = useCallback(async (skuId: string) => {
    const sku = state.skuList.find((s) => s.id === skuId);
    if (!sku) return;

    setState((prev) => ({ ...prev, currentSKU: sku, isLoadingPairs: true }));

    try {
      const pairs = await api.getImagePairs(skuId);
      setState((prev) => ({ ...prev, imagePairs: pairs, isLoadingPairs: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load image pairs';
      setState((prev) => ({ ...prev, error: message, isLoadingPairs: false }));
    }
  }, [state.skuList]);

  const toggleSKUSelection = useCallback((skuId: string) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedSKUs);
      if (newSelected.has(skuId)) {
        newSelected.delete(skuId);
      } else {
        newSelected.add(skuId);
      }
      return { ...prev, selectedSKUs: newSelected };
    });
  }, []);

  const selectAllSKUs = useCallback(() => {
    setState((prev) => {
      const allIds = new Set(prev.skuList.map((s) => s.id));
      return { ...prev, selectedSKUs: allIds };
    });
  }, []);

  const archiveSelectedSKUs = useCallback(async () => {
    const ids = Array.from(state.selectedSKUs);
    if (ids.length === 0) return;

    try {
      await api.archiveSKUs(ids);
      setState((prev) => ({ ...prev, selectedSKUs: new Set() }));
      await loadSKUs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive SKUs';
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [state.selectedSKUs, loadSKUs]);

  // ========================================
  // Image Actions
  // ========================================

  const loadImagePairs = useCallback(async (skuId: string) => {
    setState((prev) => ({ ...prev, isLoadingPairs: true }));
    try {
      const pairs = await api.getImagePairs(skuId);
      setState((prev) => ({ ...prev, imagePairs: pairs, isLoadingPairs: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load image pairs';
      setState((prev) => ({ ...prev, error: message, isLoadingPairs: false }));
    }
  }, []);

  const refreshCurrentPairs = useCallback(async () => {
    if (!state.currentSKU) return;
    await loadImagePairs(state.currentSKU.id);
  }, [state.currentSKU, loadImagePairs]);

  // ========================================
  // Modal Actions
  // ========================================

  const openModal = useCallback((modal: ModalType, image?: Image) => {
    setState((prev) => ({ ...prev, activeModal: modal, modalImage: image || null }));
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, activeModal: null, modalImage: null }));
  }, []);

  // ========================================
  // Settings Actions
  // ========================================

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.getSettings();
      setState((prev) => ({ ...prev, settings }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<StudioSettings>) => {
    if (!state.settings) return;

    try {
      const updated = { ...state.settings, ...partial };
      await api.saveSettings(updated);
      setState((prev) => ({ ...prev, settings: updated }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [state.settings]);

  // ========================================
  // Batch Actions
  // ========================================

  const startBatchProcessing = useCallback(async () => {
    const skuIds = Array.from(state.selectedSKUs);
    if (skuIds.length === 0) return;

    try {
      setState((prev) => ({ ...prev, isBatchRunning: true }));
      await api.startBatch({
        skuIds,
        doMain: true,
        doSecondary: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start batch';
      setState((prev) => ({ ...prev, error: message, isBatchRunning: false }));
    }
  }, [state.selectedSKUs]);

  const stopBatchProcessing = useCallback(async () => {
    // Cancel all running jobs
    setState((prev) => ({ ...prev, isBatchRunning: false, batchProgress: 0 }));
  }, []);

  // ========================================
  // Context Value
  // ========================================

  const value: ImageStudioContextValue = useMemo(
    () => ({
      ...state,
      setActiveTab,
      toggleProMode,
      setSelectedMode,
      loadSKUs,
      setSearchQuery,
      setFilterStatus,
      toggleOnlyMainImages,
      toggleOnlyApproved,
      selectSKU,
      toggleSKUSelection,
      selectAllSKUs,
      archiveSelectedSKUs,
      loadImagePairs,
      refreshCurrentPairs,
      openModal,
      closeModal,
      loadSettings,
      updateSettings,
      startBatchProcessing,
      stopBatchProcessing,
    }),
    [
      state,
      setActiveTab,
      toggleProMode,
      setSelectedMode,
      loadSKUs,
      setSearchQuery,
      setFilterStatus,
      toggleOnlyMainImages,
      toggleOnlyApproved,
      selectSKU,
      toggleSKUSelection,
      selectAllSKUs,
      archiveSelectedSKUs,
      loadImagePairs,
      refreshCurrentPairs,
      openModal,
      closeModal,
      loadSettings,
      updateSettings,
      startBatchProcessing,
      stopBatchProcessing,
    ]
  );

  return <ImageStudioContext.Provider value={value}>{children}</ImageStudioContext.Provider>;
}

// ========================================
// Hook to use the context
// ========================================

export function useImageStudio(): ImageStudioContextValue {
  const context = useContext(ImageStudioContext);
  if (!context) {
    throw new Error('useImageStudio must be used within ImageStudioProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add src/shared/contexts/image-studio-context.tsx
git commit -m "feat(image-studio): add React Context for state management"
```

---

### Task 5: Create useImageStudio hook wrapper

**Files:**
- Create: `src/shared/hooks/use-image-studio.ts`

**Step 1: Create the hook wrapper file**

```typescript
/**
 * Convenience hook to access ImageStudio context
 * Re-exports the useImageStudio hook from context
 */

export { useImageStudio } from '@/shared/contexts/image-studio-context';
```

**Step 2: Commit**

```bash
git add src/shared/hooks/use-image-studio.ts
git commit -m "feat(image-studio): add useImageStudio hook wrapper"
```

---

### Task 6: Add CSS variables to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add ImageStudio CSS variables**

Find the `@layer base` section with `:root` and add these variables after existing variables:

```css
@layer base {
  :root {
    /* ... existing variables ... */

    /* Image Studio Specific */
    --istudio-primary: #3a86ff;
    --istudio-primary-gradient: linear-gradient(135deg, #3a86ff 0%, #5fa8ff 100%);
    --istudio-secondary: #00d4ff;
    --istudio-secondary-gradient: linear-gradient(135deg, #00d4ff 0%, #5fa8ff 100%);
    --istudio-danger: #ff5c8d;
    --istudio-warning: #ffd166;
    --istudio-success: #06d6a0;

    /* Glass Effects */
    --istudio-glass-bg: rgba(255, 255, 255, 0.9);
    --istudio-glass-border: rgba(203, 213, 224, 0.4);

    /* Layout */
    --istudio-image-card-height: clamp(420px, 62vh, 760px);
    --istudio-sidebar-width: 320px;
    --istudio-header-height: 60px;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(image-studio): add CSS variables to globals.css"
```

---

### Task 7: Add ImageStudio component classes to globals.css

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add component CSS classes**

Find the `@layer components` section and add these classes at the end:

```css
@layer components {
  /* ... existing classes ... */

  /* ========================================
     Image Studio Component Classes
     ======================================== */

  /* Decorative gradient lines */
  .istudio-decor-line {
    @apply fixed z-0 pointer-events-none w-px h-full;
  }

  .istudio-decor-line-1 {
    @apply left-[20%];
    background: linear-gradient(to bottom, transparent, var(--istudio-primary), transparent);
    opacity: 0.3;
  }

  .istudio-decor-line-2 {
    @apply right-[20%];
    background: linear-gradient(to bottom, transparent, var(--istudio-secondary), transparent);
    opacity: 0.3;
  }

  /* Header */
  .istudio-header {
    @apply flex items-center justify-between gap-6 px-6;
    @apply bg-white/90 backdrop-blur-xl;
    @apply border-b border-border;
    height: var(--istudio-header-height);
  }

  .istudio-logo {
    @apply font-bold text-xl;
    background: var(--istudio-primary-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* Segmented control */
  .istudio-segmented {
    @apply inline-flex bg-white/80 rounded-xl border border-border overflow-hidden;
  }

  .istudio-segmented-btn {
    @apply px-4 py-2 rounded-lg text-sm text-muted-foreground transition-all duration-200;
  }

  .istudio-segmented-btn.active {
    @apply bg-primary/10 text-primary;
    box-shadow: 0 0 10px rgba(58, 134, 255, 0.2);
  }

  /* Sidebar */
  .istudio-sidebar {
    @apply bg-white/98 backdrop-blur-xl border-r border-border;
    width: var(--istudio-sidebar-width);
  }

  .istudio-sidebar-header {
    @apply p-4 border-b border-border;
  }

  /* Search box */
  .istudio-search-box {
    @apply relative;
  }

  .istudio-search-input {
    @apply w-full pl-10 pr-4 py-2.5;
    @apply bg-white/90 border border-border rounded-lg;
    @apply text-sm;
    @apply transition-all duration-300;
  }

  .istudio-search-input:focus {
    @apply ring-2 ring-primary/20 border-primary;
  }

  .istudio-search-icon {
    @apply absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground;
  }

  /* Pill buttons */
  .istudio-pill {
    @apply inline-flex items-center gap-1.5;
    @apply border border-border bg-white rounded-full px-3 py-1.5;
    @apply text-xs cursor-pointer;
    @apply transition-all duration-200;
  }

  .istudio-pill-primary {
    @apply border-primary bg-primary/10 text-primary;
  }

  .istudio-pill-primary.active {
    background: var(--istudio-primary-gradient);
    @apply text-white border-transparent;
  }

  /* Status select */
  .istudio-status-select {
    @apply w-full px-3 py-2;
    @apply bg-white/90 border border-border rounded-lg;
    @apply text-sm;
    @apply cursor-pointer;
  }

  /* SKU list */
  .istudio-sku-list {
    @apply flex-1 overflow-y-auto p-3;
  }

  .istudio-sku-item {
    @apply flex items-center gap-3 p-3 rounded-lg cursor-pointer;
    @apply transition-all duration-200 border border-transparent;
  }

  .istudio-sku-item:hover {
    @apply bg-muted/50;
  }

  .istudio-sku-item.selected {
    @apply bg-primary/5 border-primary/30;
  }

  .istudio-sku-checkbox {
    @apply w-4 h-4 rounded border-border;
  }

  .istudio-sku-thumbnail {
    @apply w-10 h-10 rounded object-cover bg-muted;
  }

  .istudio-sku-status {
    @apply w-2 h-2 rounded-full;
  }

  .istudio-sku-status.not_generated {
    @apply bg-muted;
  }

  .istudio-sku-status.main_generated {
    @apply bg-blue-500;
  }

  .istudio-sku-status.done {
    @apply bg-green-500;
  }

  /* Archive footer */
  .istudio-archive-footer {
    @apply p-4 border-t border-border;
  }

  /* Main content */
  .istudio-main-content {
    @apply flex-1 flex flex-col overflow-hidden;
  }

  .istudio-content-header {
    @apply p-6 border-b border-border;
  }

  .istudio-content-title {
    @apply text-xl font-semibold;
  }

  .istudio-content-subtitle {
    @apply text-sm text-muted-foreground;
  }

  /* Image grid */
  .istudio-image-grid {
    @apply flex-1 overflow-y-auto p-6;
    @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
  }

  /* Image pair card */
  .istudio-image-card {
    @apply rounded-xl border bg-card overflow-hidden;
    @apply transition-all duration-200;
  }

  .istudio-image-card:hover {
    @apply shadow-lg;
  }

  .istudio-image-card-header {
    @apply p-3 border-b border-border flex justify-between items-center;
  }

  .istudio-image-card-body {
    @apply p-4;
    @apply grid grid-cols-2 gap-4;
  }

  .istudio-image-container {
    @apply relative rounded-lg overflow-hidden bg-muted/20;
  }

  .istudio-image-container img {
    @apply w-full h-full object-cover;
  }

  .istudio-image-overlay {
    @apply absolute inset-0 bg-black/50 opacity-0;
    @apply flex items-center justify-center gap-2;
    @apply transition-opacity duration-200;
  }

  .istudio-image-container:hover .istudio-image-overlay {
    @apply opacity-100;
  }

  /* Batch footer */
  .istudio-batch-footer {
    @apply p-4 border-t border-border bg-muted/20;
  }

  .istudio-progress-bar {
    @apply h-2 bg-muted rounded-full overflow-hidden;
  }

  .istudio-progress-bar-inner {
    @apply h-full bg-gradient-to-r from-primary to-cyan-400;
    @apply transition-all duration-300;
  }

  .istudio-batch-stats {
    @apply flex gap-6 mt-3;
  }

  .istudio-stat-item {
    @apply text-center;
  }

  .istudio-stat-label {
    @apply text-xs text-muted-foreground;
  }

  .istudio-stat-value {
    @apply text-lg font-semibold;
  }

  .istudio-batch-actions {
    @apply flex gap-2 mt-3;
  }

  /* Modal */
  .istudio-modal-mask {
    @apply fixed inset-0 bg-black/30 backdrop-blur-sm z-50;
    @apply flex items-center justify-center p-4;
  }

  .istudio-modal {
    @apply bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden;
    @apply flex flex-col;
  }

  .istudio-modal-header {
    @apply p-4 border-b border-border flex justify-between items-center;
  }

  .istudio-modal-title {
    @apply font-semibold;
  }

  .istudio-modal-close {
    @apply w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center;
    @apply cursor-pointer transition-colors;
  }

  .istudio-modal-body {
    @apply p-6 overflow-y-auto flex-1;
  }

  .istudio-modal-footer {
    @apply p-4 border-t border-border flex justify-end gap-2;
  }

  /* Checkbox groups */
  .istudio-checkbox-group {
    @apply space-y-2;
  }

  .istudio-checkbox-label {
    @apply flex items-center gap-2 cursor-pointer;
  }

  /* Form elements */
  .istudio-input {
    @apply w-full px-3 py-2 border border-border rounded-lg;
    @apply text-sm transition-colors;
  }

  .istudio-input:focus {
    @apply ring-2 ring-primary/20 border-primary outline-none;
  }

  .istudio-textarea {
    @apply w-full px-3 py-2 border border-border rounded-lg;
    @apply text-sm min-h-[100px] resize-y transition-colors;
  }

  .istudio-textarea:focus {
    @apply ring-2 ring-primary/20 border-primary outline-none;
  }

  .istudio-select {
    @apply w-full px-3 py-2 border border-border rounded-lg;
    @apply text-sm cursor-pointer transition-colors;
  }

  .istudio-select:focus {
    @apply ring-2 ring-primary/20 border-primary outline-none;
  }

  /* Status badges */
  .istudio-badge {
    @apply px-2 py-0.5 rounded-full text-xs font-medium;
  }

  .istudio-badge.pending {
    @apply bg-muted text-muted-foreground;
  }

  .istudio-badge.processing {
    @apply bg-blue-100 text-blue-700;
  }

  .istudio-badge.done {
    @apply bg-green-100 text-green-700;
  }

  .istudio-badge.failed {
    @apply bg-red-100 text-red-700;
  }

  /* Hidden utility */
  .istudio-hidden {
    @apply hidden;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(image-studio): add component CSS classes"
```

---

### Task 8: Configure Next.js rewrites for backend proxy

**Files:**
- Modify: `next.config.mjs` (or `next.config.js` if using JS)

**Step 1: Add rewrites configuration**

If using `.mjs`:

```javascript
// next.config.mjs
/** @param {import('next').NextConfig} config */
const config = {
  // ... existing config ...

  async rewrites() {
    return [
      {
        source: '/api/image-studio/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default config;
```

If using `.js`:

```javascript
// next.config.js
module.exports = {
  // ... existing config ...

  async rewrites() {
    return [
      {
        source: '/api/image-studio/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};
```

**Step 2: Commit**

```bash
git add next.config.mjs
git commit -m "feat(image-studio): add API proxy rewrites for backend"
```

---

## Phase 2: Page Entry Point

### Task 9: Create the main page component

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/imagestudio/page.tsx`

**Step 1: Create the page file**

```typescript
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImageStudioProvider } from '@/shared/contexts/image-studio-context';
import { ImageStudioContainer } from '@/shared/blocks/image-studio';

export default async function ImageStudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.imagestudio');

  return (
    <ImageStudioProvider>
      <ImageStudioContainer locale={locale} />
    </ImageStudioProvider>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/imagestudio/page.tsx
git commit -m "feat(image-studio): create main page entry"
```

---

## Phase 3: Core Components

### Task 10: Create the main container component

**Files:**
- Create: `src/shared/blocks/image-studio/image-studio-container.tsx`

**Step 1: Create the container component**

```typescript
'use client';

import { useEffect } from 'react';

import { ImageStudioProvider } from '@/shared/contexts/image-studio-context';
import { StudioHeader } from './header';
import { StudioSidebar } from './sidebar';
import { StudioMainContent } from './main-content';

interface ImageStudioContainerProps {
  locale: string;
}

export function ImageStudioContainer({ locale }: ImageStudioContainerProps) {
  return (
    <div className="fixed inset-0 bg-background">
      {/* Decorative gradient lines */}
      <div className="istudio-decor-line istudio-decor-line-1" />
      <div className="istudio-decor-line istudio-decor-line-2" />

      {/* Header */}
      <StudioHeader />

      {/* Main container */}
      <div className="flex" style={{ height: 'calc(100vh - var(--istudio-header-height) - 24px)', margin: '12px 24px' }}>
        <StudioSidebar />
        <StudioMainContent />
      </div>
    </div>
  );
}

// Export provider wrapper for page
export function ImageStudioWrapper({ children }: { children: React.ReactNode }) {
  return <ImageStudioProvider>{children}</ImageStudioProvider>;
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/image-studio-container.tsx
git commit -m "feat(image-studio): create main container component"
```

---

### Task 11: Create the header component

**Files:**
- Create: `src/shared/blocks/image-studio/header.tsx`

**Step 1: Create the header component**

```typescript
'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';

export function StudioHeader() {
  const { activeTab, setActiveTab, proMode, toggleProMode, openModal } = useImageStudio();
  const [currentTime, setCurrentTime] = useState('');

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="istudio-header relative z-10">
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-30" />

      {/* Logo */}
      <div className="istudio-logo">
        AI Image Batch Processing
      </div>

      {/* Tab buttons */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="istudio-segmented">
          <button
            className={`istudio-segmented-btn ${activeTab === 'processing' ? 'active' : ''}`}
            onClick={() => setActiveTab('processing')}
            type="button"
          >
            Image Processing
          </button>
          <button
            className={`istudio-segmented-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            type="button"
          >
            History
          </button>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Time display */}
        <div className="text-xs text-muted-foreground font-mono px-3 py-1.5 bg-white/80 rounded-lg border border-border">
          {currentTime}
        </div>

        {/* Pro mode toggle */}
        <Button
          variant={proMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleProMode}
        >
          Pro Mode
        </Button>

        {/* Action buttons */}
        <Button variant="outline" size="sm" onClick={() => openModal('download')}>
          <SmartIcon name="Download" className="mr-2 h-4 w-4" />
          Download
        </Button>

        <Button variant="outline" size="sm" onClick={() => openModal('settings')}>
          <SmartIcon name="Settings" className="mr-2 h-4 w-4" />
          Settings
        </Button>

        <Button variant="outline" size="sm" onClick={() => openModal('upload')}>
          <SmartIcon name="Upload" className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>
    </header>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/header.tsx
git commit -m "feat(image-studio): create header component"
```

---

### Task 12: Create the sidebar component

**Files:**
- Create: `src/shared/blocks/image-studio/sidebar.tsx`

**Step 1: Create the sidebar component**

```typescript
'use client';

import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';
import { SKUList } from './sku-list';

export function StudioSidebar() {
  const {
    skuList,
    selectedSKUs,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    onlyMainImages,
    onlyApproved,
    toggleOnlyMainImages,
    toggleOnlyApproved,
    selectAllSKUs,
    archiveSelectedSKUs,
    isLoadingSKUs,
  } = useImageStudio();

  const allSelected = skuList.length > 0 && selectedSKUs.size === skuList.length;

  return (
    <aside className="istudio-sidebar flex flex-col">
      {/* Sidebar header */}
      <div className="istudio-sidebar-header">
        {/* Search box */}
        <div className="istudio-search-box">
          <SmartIcon name="Search" className="istudio-search-icon h-4 w-4" />
          <Input
            placeholder="Search SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="istudio-search-input"
          />
        </div>

        {/* Bulk select controls */}
        <div className="flex gap-2 mt-3">
          {/* Select all checkbox */}
          <label className="istudio-pill">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) selectAllSKUs();
              }}
              className="istudio-sku-checkbox"
            />
            <span>Select All</span>
          </label>

          {/* Only main images */}
          <button
            className={`istudio-pill istudio-pill-primary ${onlyMainImages ? 'active' : ''}`}
            onClick={toggleOnlyMainImages}
            type="button"
          >
            <SmartIcon name="Star" className="h-3 w-3" />
            <span>Main Only</span>
          </button>

          {/* Approved only */}
          <button
            className={`istudio-pill istudio-pill-primary ${onlyApproved ? 'active' : ''}`}
            onClick={toggleOnlyApproved}
            type="button"
          >
            <SmartIcon name="Check" className="h-3 w-3" />
            <span>Approved</span>
          </button>
        </div>

        {/* Status filter */}
        <div className="mt-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="istudio-status-select"
          >
            <option value="all">All Status</option>
            <option value="not_generated">Not Generated</option>
            <option value="main_generated">Main Generated</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* SKU list */}
      <SKUList />

      {/* Archive footer */}
      <div className="istudio-archive-footer">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Selected: {selectedSKUs.size}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={archiveSelectedSKUs}
            disabled={selectedSKUs.size === 0}
          >
            <SmartIcon name="Archive" className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/sidebar.tsx
git commit -m "feat(image-studio): create sidebar component"
```

---

### Task 13: Create the SKU list component

**Files:**
- Create: `src/shared/blocks/image-studio/sku-list.tsx`

**Step 1: Create the SKU list component**

```typescript
'use client';

import { memo } from 'react';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SKUItem } from './sku-item';
import { Skeleton } from '@/shared/components/ui/skeleton';

export const SKUList = memo(function SKUList() {
  const { skuList, currentSKU, selectSKU, isLoadingSKUs } = useImageStudio();

  if (isLoadingSKUs) {
    return (
      <div className="istudio-sku-list space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (skuList.length === 0) {
    return (
      <div className="istudio-sku-list flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No SKUs found</p>
      </div>
    );
  }

  return (
    <div className="istudio-sku-list space-y-1.5">
      {skuList.map((sku) => (
        <SKUItem
          key={sku.id}
          sku={sku}
          isSelected={currentSKU?.id === sku.id}
          onSelect={() => selectSKU(sku.id)}
        />
      ))}
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/sku-list.tsx
git commit -m "feat(image-studio): create SKU list component"
```

---

### Task 14: Create the SKU item component

**Files:**
- Create: `src/shared/blocks/image-studio/sku-item.tsx`

**Step 1: Create the SKU item component**

```typescript
'use client';

import { memo } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useImageStudio } from '@/shared/hooks/use-image-studio';

interface SKUItemProps {
  sku: {
    id: string;
    article: string;
    status: 'not_generated' | 'main_generated' | 'done';
    isMainImage: boolean;
    isApproved: boolean;
    thumbnail: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

const statusLabels = {
  not_generated: 'Not Generated',
  main_generated: 'Main Generated',
  done: 'Done',
};

export const SKUItem = memo(function SKUItem({ sku, isSelected, onSelect }: SKUItemProps) {
  const { selectedSKUs, toggleSKUSelection } = useImageStudio();
  const isCheckboxSelected = selectedSKUs.has(sku.id);

  return (
    <div
      className={`istudio-sku-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isCheckboxSelected}
        onCheckedChange={() => toggleSKUSelection(sku.id)}
        onClick={(e) => e.stopPropagation()}
        className="istudio-sku-checkbox flex-shrink-0"
      />

      {/* Thumbnail */}
      <div className="istudio-sku-thumbnail flex-shrink-0">
        {sku.thumbnail ? (
          <img
            src={sku.thumbnail}
            alt={sku.article}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">No img</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{sku.article}</div>
        <div className="text-xs text-muted-foreground">{statusLabels[sku.status]}</div>
      </div>

      {/* Status indicator */}
      <div className={`istudio-sku-status ${sku.status}`} />

      {/* Badges */}
      <div className="flex gap-1">
        {sku.isMainImage && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
            Main
          </span>
        )}
        {sku.isApproved && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            Approved
          </span>
        )}
      </div>
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/sku-item.tsx
git commit -m "feat(image-studio): create SKU item component"
```

---

### Task 15: Create the main content component

**Files:**
- Create: `src/shared/blocks/image-studio/main-content.tsx`

**Step 1: Create the main content component**

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';
import { ImagePairsGrid } from './image-pairs-grid';
import { BatchFooter } from './batch-footer';

export function StudioMainContent() {
  const {
    currentSKU,
    selectedMode,
    setSelectedMode,
    refreshCurrentPairs,
  } = useImageStudio();

  return (
    <div className="istudio-main-content">
      {/* Content header */}
      <div className="istudio-content-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="istudio-content-title">
              {currentSKU ? currentSKU.article : 'Select a SKU'}
            </h1>
            {currentSKU && (
              <p className="istudio-content-subtitle">
                {currentSKU.status === 'not_generated' && 'Images not yet generated'}
                {currentSKU.status === 'main_generated' && 'Main image generated'}
                {currentSKU.status === 'done' && 'All images generated'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Mode tabs */}
            <div className="istudio-segmented">
              <button
                className={`istudio-segmented-btn ${selectedMode === 'continuous' ? 'active' : ''}`}
                onClick={() => setSelectedMode('continuous')}
                type="button"
              >
                Continuous
              </button>
              <button
                className={`istudio-segmented-btn ${selectedMode === 'step-review' ? 'active' : ''}`}
                onClick={() => setSelectedMode('step-review')}
                type="button"
              >
                Step Review
              </button>
            </div>

            {/* Refresh button */}
            <Button variant="outline" size="sm" onClick={refreshCurrentPairs}>
              <SmartIcon name="RefreshCw" className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Image pairs grid */}
      <ImagePairsGrid />

      {/* Batch footer */}
      <BatchFooter />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/main-content.tsx
git commit -m "feat(image-studio): create main content component"
```

---

### Task 16: Create the image pairs grid component

**Files:**
- Create: `src/shared/blocks/image-studio/image-pairs-grid.tsx`

**Step 1: Create the image pairs grid component**

```typescript
'use client';

import { memo } from 'react';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { ImagePairCard } from './image-pair-card';
import { Skeleton } from '@/shared/components/ui/skeleton';

export const ImagePairsGrid = memo(function ImagePairsGrid() {
  const { imagePairs, currentSKU, selectedMode, isLoadingPairs } = useImageStudio();

  if (!currentSKU) {
    return (
      <div className="istudio-image-grid flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Select a SKU from the sidebar to view images</p>
        </div>
      </div>
    );
  }

  if (isLoadingPairs) {
    return (
      <div className="istudio-image-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  if (imagePairs.length === 0) {
    return (
      <div className="istudio-image-grid flex items-center justify-center">
        <p className="text-muted-foreground">No image pairs found for this SKU</p>
      </div>
    );
  }

  return (
    <div className="istudio-image-grid">
      {imagePairs.map((pair) => (
        <ImagePairCard
          key={pair.id}
          pair={pair}
          mode={selectedMode}
        />
      ))}
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/image-pairs-grid.tsx
git commit -m "feat(image-studio): create image pairs grid component"
```

---

### Task 17: Create the image pair card component

**Files:**
- Create: `src/shared/blocks/image-studio/image-pair-card.tsx`

**Step 1: Create the image pair card component**

```typescript
'use client';

import { memo, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';

interface ImagePairCardProps {
  pair: {
    id: string;
    type: 'main' | 'secondary';
    original: { url: string; width: number; height: number };
    generated: { url: string; width: number; height: number } | null;
    status: 'pending' | 'processing' | 'done' | 'failed';
  };
  mode: 'continuous' | 'step-review';
}

const statusConfig = {
  pending: { label: 'Pending', className: 'pending' },
  processing: { label: 'Processing...', className: 'processing' },
  done: { label: 'Done', className: 'done' },
  failed: { label: 'Failed', className: 'failed' },
};

export const ImagePairCard = memo(function ImagePairCard({ pair, mode }: ImagePairCardProps) {
  const { openModal } = useImageStudio();
  const [imageLoading, setImageLoading] = useState(true);

  const statusInfo = statusConfig[pair.status];

  return (
    <div className="istudio-image-card">
      {/* Card header */}
      <div className="istudio-image-card-header">
        <div>
          <span className="text-sm font-medium">
            {pair.type === 'main' ? 'Main Image' : 'Secondary Image'}
          </span>
          <span className={`istudio-badge ml-2 ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
        {pair.generated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('image', pair.generated)}
          >
            <SmartIcon name="MoreHorizontal" className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Card body - images */}
      <div className="istudio-image-card-body">
        {/* Original image */}
        <div className="istudio-image-container aspect-square">
          <img
            src={pair.original.url}
            alt="Original"
            className={`transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setImageLoading(false)}
          />
          <div className="istudio-image-overlay">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(pair.original.url, '_blank')}
            >
              <SmartIcon name="ExternalLink" className="mr-2 h-4 w-4" />
              View Original
            </Button>
          </div>
        </div>

        {/* Generated image */}
        <div className="istudio-image-container aspect-square bg-muted/30">
          {pair.generated ? (
            <>
              <img
                src={pair.generated.url}
                alt="Generated"
                className="w-full h-full object-cover"
              />
              <div className="istudio-image-overlay">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(pair.generated.url, '_blank')}
                >
                  <SmartIcon name="ExternalLink" className="mr-2 h-4 w-4" />
                  View Result
                </Button>
              </div>
            </>
          ) : pair.status === 'processing' ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Generating...</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Not generated yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/image-pair-card.tsx
git commit -m "feat(image-studio): create image pair card component"
```

---

### Task 18: Create the batch footer component

**Files:**
- Create: `src/shared/blocks/image-studio/batch-footer.tsx`

**Step 1: Create the batch footer component**

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';
import { useInterval } from '@/shared/hooks/use-interval';

export function BatchFooter() {
  const {
    batchProgress,
    batchStats,
    isBatchRunning,
    startBatchProcessing,
    stopBatchProcessing,
    selectedSKUs,
  } = useImageStudio();

  // Poll for progress when batch is running
  useInterval(async () => {
    if (isBatchRunning) {
      // Progress will be updated via context
      // This is a placeholder - actual polling would call getProgress()
    }
  }, isBatchRunning ? 2000 : null);

  return (
    <div className="istudio-batch-footer">
      {/* Progress section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Batch Progress</span>
          <span className="text-sm text-muted-foreground">{batchProgress.toFixed(0)}%</span>
        </div>
        <div className="istudio-progress-bar">
          <div
            className="istudio-progress-bar-inner"
            style={{ width: `${batchProgress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="istudio-batch-stats">
        <div className="istudio-stat-item">
          <div className="istudio-stat-label">Total</div>
          <div className="istudio-stat-value">{batchStats.total}</div>
        </div>
        <div className="istudio-stat-item">
          <div className="istudio-stat-label">Running</div>
          <div className="istudio-stat-value text-blue-600">{batchStats.running}</div>
        </div>
        <div className="istudio-stat-item">
          <div className="istudio-stat-label">Done</div>
          <div className="istudio-stat-value text-green-600">{batchStats.done}</div>
        </div>
        <div className="istudio-stat-item">
          <div className="istudio-stat-label">Failed</div>
          <div className="istudio-stat-value text-red-600">{batchStats.failed}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="istudio-batch-actions">
        {isBatchRunning ? (
          <Button variant="destructive" onClick={stopBatchProcessing}>
            <SmartIcon name="X" className="mr-2 h-4 w-4" />
            Stop Batch
          </Button>
        ) : (
          <Button onClick={startBatchProcessing} disabled={selectedSKUs.size === 0}>
            <SmartIcon name="Play" className="mr-2 h-4 w-4" />
            Start Batch Processing
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/batch-footer.tsx
git commit -m "feat(image-studio): create batch footer component"
```

---

### Task 19: Create the components index file

**Files:**
- Create: `src/shared/blocks/image-studio/index.tsx`

**Step 1: Create the index file**

```typescript
// Main components
export { ImageStudioContainer } from './image-studio-container';
export { StudioHeader } from './header';
export { StudioSidebar } from './sidebar';
export { StudioMainContent } from './main-content';

// Sub-components
export { SKUList } from './sku-list';
export { SKUItem } from './sku-item';
export { ImagePairsGrid } from './image-pairs-grid';
export { ImagePairCard } from './image-pair-card';
export { BatchFooter } from './batch-footer';

// Types
export * from './types';
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/index.tsx
git commit -m "feat(image-studio): create components index"
```

---

## Phase 4: Modal Components

### Task 20: Create the settings modal component

**Files:**
- Create: `src/shared/blocks/image-studio/modals/settings-modal.tsx`

**Step 1: Create the settings modal component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';

export function SettingsModal() {
  const { settings, updateSettings, closeModal } = useImageStudio();
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!settings) return null;

  const handleSave = async () => {
    await updateSettings(localSettings);
    closeModal();
  };

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Settings</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="istudio-modal-body">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
            </TabsList>

            {/* Basic settings */}
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="apiBase">API Base URL</Label>
                <Input
                  id="apiBase"
                  value={localSettings.apiBase}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, apiBase: e.target.value })
                  }
                  placeholder="https://api.example.com"
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                />
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={localSettings.model}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, model: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetWidth">Target Width</Label>
                  <Input
                    id="targetWidth"
                    type="number"
                    value={localSettings.targetWidth}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        targetWidth: parseInt(e.target.value) || 1500,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="targetHeight">Target Height</Label>
                  <Input
                    id="targetHeight"
                    type="number"
                    value={localSettings.targetHeight}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        targetHeight: parseInt(e.target.value) || 2000,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={localSettings.temperature}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      temperature: parseFloat(e.target.value) || 0.5,
                    })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="resumeMode">Resume Mode</Label>
                  <Switch
                    id="resumeMode"
                    checked={localSettings.resumeMode}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, resumeMode: !!checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="continuousView">Continuous View</Label>
                  <Switch
                    id="continuousView"
                    checked={localSettings.continuousView}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, continuousView: !!checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showFinalPrompt">Show Final Prompt</Label>
                  <Switch
                    id="showFinalPrompt"
                    checked={localSettings.showFinalPrompt}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, showFinalPrompt: !!checked })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* Prompt settings */}
            <TabsContent value="prompts" className="space-y-4">
              <div>
                <Label htmlFor="promptCommon">Common Prompt</Label>
                <Textarea
                  id="promptCommon"
                  value={localSettings.prompts.common}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      prompts: { ...localSettings.prompts, common: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="promptMain">Main Image Prompt</Label>
                <Textarea
                  id="promptMain"
                  value={localSettings.prompts.main}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      prompts: { ...localSettings.prompts, main: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="promptSecondary">Secondary Image Prompt</Label>
                <Textarea
                  id="promptSecondary"
                  value={localSettings.prompts.secondary}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      prompts: { ...localSettings.prompts, secondary: e.target.value },
                    })
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="istudio-modal-footer">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/modals/settings-modal.tsx
git commit -m "feat(image-studio): create settings modal component"
```

---

### Task 21: Create the image operation modal component

**Files:**
- Create: `src/shared/blocks/image-studio/modals/image-modal.tsx`

**Step 1: Create the image operation modal component**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Textarea } from '@/shared/components/ui/textarea';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';

export function ImageModal() {
  const { modalImage, closeModal } = useImageStudio();
  const [options, setOptions] = useState({
    includeCommon: true,
    includeRole: true,
    includeTitleDetails: false,
    includePlan: false,
    includeStyle: false,
    optWatermark: false,
    optLogo: false,
    optTextEdit: false,
    optRestructure: false,
    optRecolor: false,
    optAddMarkers: false,
    strongConsistency: false,
  });
  const [extraPrompt, setExtraPrompt] = useState('');

  if (!modalImage) return null;

  const handleRegenerate = async () => {
    // Call regenerate API with options
    closeModal();
  };

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Image Operations</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="istudio-modal-body">
          {/* Image preview */}
          <div className="mb-4 rounded-lg overflow-hidden bg-muted/20">
            <img
              src={modalImage.url}
              alt="Preview"
              className="w-full h-auto max-h-64 object-contain"
            />
          </div>

          {/* Generation options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Generation Options</Label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.includeCommon}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeCommon: !!checked })
                  }
                />
                <span className="text-sm">Common</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.includeRole}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeRole: !!checked })
                  }
                />
                <span className="text-sm">Main/Secondary</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.includeTitleDetails}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeTitleDetails: !!checked })
                  }
                />
                <span className="text-sm">Title Details</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.includePlan}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includePlan: !!checked })
                  }
                />
                <span className="text-sm">Plan</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.includeStyle}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeStyle: !!checked })
                  }
                />
                <span className="text-sm">Style</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.strongConsistency}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, strongConsistency: !!checked })
                  }
                />
                <span className="text-sm">Strong Consistency</span>
              </label>
            </div>

            <Label className="text-sm font-medium mt-4">Modification Options</Label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.optWatermark}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, optWatermark: !!checked })
                  }
                />
                <span className="text-sm">Remove Watermark</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.optLogo}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, optLogo: !!checked })
                  }
                />
                <span className="text-sm">Remove Logo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.optTextEdit}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, optTextEdit: !!checked })
                  }
                />
                <span className="text-sm">Text Edit</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.optRestructure}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, optRestructure: !!checked })
                  }
                />
                <span className="text-sm">Restructure</span>
              </label>
            </div>

            <Label className="text-sm font-medium mt-4">Extra Prompt (Optional)</Label>
            <Textarea
              placeholder="Add any additional requirements..."
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="istudio-modal-footer">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate}>
            <SmartIcon name="RefreshCw" className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/modals/image-modal.tsx
git commit -m "feat(image-studio): create image operation modal component"
```

---

### Task 22: Create placeholder modals (progress, download, upload)

**Files:**
- Create: `src/shared/blocks/image-studio/modals/progress-modal.tsx`
- Create: `src/shared/blocks/image-studio/modals/download-modal.tsx`
- Create: `src/shared/blocks/image-studio/modals/upload-modal.tsx`
- Create: `src/shared/blocks/image-studio/modals/opt-prompt-modal.tsx`

**Step 1: Create placeholder progress modal**

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { SmartIcon } from '@/shared/blocks/common';

export function ProgressModal() {
  const { closeModal } = useImageStudio();

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Batch Progress</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="istudio-modal-body">
          <p className="text-muted-foreground">Progress tracking coming soon...</p>
        </div>
        <div className="istudio-modal-footer">
          <Button onClick={closeModal}>Close</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create placeholder download modal**

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useImageStudio } from '@/shared/hooks/use-image-studio';

export function DownloadModal() {
  const { closeModal } = useImageStudio();

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Download Images</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="istudio-modal-body">
          <div className="space-y-4">
            <div>
              <Label htmlFor="shop">Shop</Label>
              <select id="shop" className="istudio-select">
                <option>Select a shop...</option>
              </select>
            </div>
            <div>
              <Label htmlFor="articles">Articles (one per line)</Label>
              <Textarea
                id="articles"
                placeholder="SKU-001&#10;SKU-002&#10;SKU-003"
              />
            </div>
          </div>
        </div>
        <div className="istudio-modal-footer">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button>Start Download</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create placeholder upload modal**

```typescript
'use client';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useImageStudio } from '@/shared/hooks/use-image-studio';

export function UploadModal() {
  const { closeModal } = useImageStudio();

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Upload Images</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="istudio-modal-body">
          <div className="space-y-4">
            <div>
              <Label htmlFor="files">Select Images</Label>
              <Input id="files" type="file" multiple accept="image/*" />
            </div>
          </div>
        </div>
        <div className="istudio-modal-footer">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button>Upload</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Create placeholder optimize prompt modal**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useImageStudio } from '@/shared/hooks/use-image-studio';

export function OptPromptModal() {
  const { closeModal } = useImageStudio();
  const [prompt, setPrompt] = useState('');

  return (
    <div className="istudio-modal-mask" onClick={closeModal}>
      <div className="istudio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="istudio-modal-header">
          <h2 className="istudio-modal-title">Optimize Image</h2>
          <button className="istudio-modal-close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="istudio-modal-body">
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">Optimization Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the changes you want..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="istudio-modal-footer">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button>Start Optimization</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Create modals index file**

```typescript
export { SettingsModal } from './settings-modal';
export { ImageModal } from './image-modal';
export { ProgressModal } from './progress-modal';
export { DownloadModal } from './download-modal';
export { UploadModal } from './upload-modal';
export { OptPromptModal } from './opt-prompt-modal';
```

**Step 6: Commit**

```bash
git add src/shared/blocks/image-studio/modals/
git commit -m "feat(image-studio): create placeholder modal components"
```

---

### Task 23: Add modal rendering to main container

**Files:**
- Modify: `src/shared/blocks/image-studio/image-studio-container.tsx`

**Step 1: Update container to render modals**

```typescript
'use client';

import { useEffect } from 'react';

import { useImageStudio } from '@/shared/hooks/use-image-studio';
import { StudioHeader } from './header';
import { StudioSidebar } from './sidebar';
import { StudioMainContent } from './main-content';
import {
  SettingsModal,
  ImageModal,
  ProgressModal,
  DownloadModal,
  UploadModal,
  OptPromptModal,
} from './modals';

interface ImageStudioContainerProps {
  locale: string;
}

export function ImageStudioContainer({ locale }: ImageStudioContainerProps) {
  const { activeModal, loadSKUs, loadSettings } = useImageStudio();

  // Load initial data
  useEffect(() => {
    loadSKUs();
    loadSettings();
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      {/* Decorative gradient lines */}
      <div className="istudio-decor-line istudio-decor-line-1" />
      <div className="istudio-decor-line istudio-decor-line-2" />

      {/* Header */}
      <StudioHeader />

      {/* Main container */}
      <div
        className="flex"
        style={{
          height: 'calc(100vh - var(--istudio-header-height) - 24px)',
          margin: '12px 24px',
        }}
      >
        <StudioSidebar />
        <StudioMainContent />
      </div>

      {/* Modals */}
      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'image' && <ImageModal />}
      {activeModal === 'progress' && <ProgressModal />}
      {activeModal === 'download' && <DownloadModal />}
      {activeModal === 'upload' && <UploadModal />}
      {activeModal === 'opt-prompt' && <OptPromptModal />}
    </div>
  );
}

// Export provider wrapper for page
export function ImageStudioWrapper({ children }: { children: React.ReactNode }) {
  return <ImageStudioProvider>{children}</ImageStudioProvider>;
}
```

**Step 2: Commit**

```bash
git add src/shared/blocks/image-studio/image-studio-container.tsx
git commit -m "feat(image-studio): add modal rendering to container"
```

---

### Task 24: Add i18n strings to messages file

**Files:**
- Modify: `src/messages/en.json`

**Step 1: Add imagestudio translations**

Find the `dashboard` section and add the imagestudio subsection:

```json
{
  "dashboard": {
    "overview": { ... },
    "gallery": { ... },
    "imagestudio": {
      "crumb": "Image Studio",
      "crumb_dashboard": "Dashboard",
      "title": "AI Image Studio",
      "description": "Batch process product images with AI"
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/messages/en.json
git commit -m "feat(image-studio): add i18n strings"
```

---

## Phase 5: API Routes (Backend Proxy)

### Task 25: Create SKU list API route

**Files:**
- Create: `src/app/api/image-studio/skus/route.ts`

**Step 1: Create the SKU list route**

```typescript
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { z } from 'zod';

const getSKUsSchema = z.object({
  status: z.enum(['all', 'not_generated', 'main_generated', 'done']).optional(),
  search: z.string().optional(),
  onlyMain: z.coerce.boolean().optional(),
  onlyApproved: z.coerce.boolean().optional(),
});

// GET - List SKUs with filters
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);

    const validated = getSKUsSchema.safeParse(params);
    if (!validated.success) {
      return respErr(validated.error.issues[0].message);
    }

    // Proxy to backend
    const backendUrl = new URL('http://localhost:8000/skus');
    Object.entries(validated.data).forEach(([key, value]) => {
      if (value !== undefined) backendUrl.searchParams.set(key, String(value));
    });

    const response = await fetch(backendUrl.toString());
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Get SKUs error:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to get SKUs');
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/image-studio/skus/route.ts
git commit -m "feat(image-studio): add SKU list API route"
```

---

### Task 26: Create settings API route

**Files:**
- Create: `src/app/api/image-studio/settings/route.ts`

**Step 1: Create the settings route**

```typescript
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

// GET - Get user's ImageStudio settings
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    // Proxy to backend
    const response = await fetch('http://localhost:8000/settings');
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Get settings error:', error);
    return respErr('Failed to get settings');
  }
}

// POST - Save settings
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    const response = await fetch('http://localhost:8000/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Save settings error:', error);
    return respErr('Failed to save settings');
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/image-studio/settings/route.ts
git commit -m "feat(image-studio): add settings API route"
```

---

### Task 27: Create image pairs API route

**Files:**
- Create: `src/app/api/image-studio/pairs/[skuId]/route.ts`

**Step 1: Create the image pairs route**

```typescript
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

// GET - Get image pairs for a SKU
export async function GET(
  req: Request,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { skuId } = await params;

    const response = await fetch(`http://localhost:8000/pairs/${skuId}`);
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Get image pairs error:', error);
    return respErr('Failed to get image pairs');
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/image-studio/pairs/[skuId]/route.ts
git commit -m "feat(image-studio): add image pairs API route"
```

---

### Task 28: Create batch processing API route

**Files:**
- Create: `src/app/api/image-studio/batch/route.ts`

**Step 1: Create the batch route**

```typescript
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { z } from 'zod';

const batchSchema = z.object({
  skuIds: z.array(z.string()),
  doMain: z.boolean(),
  doSecondary: z.boolean(),
});

// POST - Start batch processing
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const validated = batchSchema.safeParse(body);

    if (!validated.success) {
      return respErr(validated.error.issues[0].message);
    }

    const response = await fetch('http://localhost:8000/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated.data),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Start batch error:', error);
    return respErr('Failed to start batch processing');
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/image-studio/batch/route.ts
git commit -m "feat(image-studio): add batch processing API route"
```

---

### Task 29: Create progress API route

**Files:**
- Create: `src/app/api/image-studio/progress/route.ts`

**Step 1: Create the progress route**

```typescript
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

// GET - Get batch processing progress
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const response = await fetch('http://localhost:8000/progress');
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return respData(data);
  } catch (error) {
    console.error('Get progress error:', error);
    return respErr('Failed to get progress');
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/image-studio/progress/route.ts
git commit -m "feat(image-studio): add progress API route"
```

---

## Phase 6: Testing & Polish

### Task 30: Test the page loads without errors

**Files:** None (manual test)

**Step 1: Start the dev server**

```bash
npm run dev
```

**Step 2: Navigate to the page**

Open browser to: `http://localhost:3000/dashboard/imagestudio`

**Step 3: Verify the following:**
- [ ] Page loads without TypeScript errors
- [ ] Header displays with logo and tabs
- [ ] Sidebar displays with search and filters
- [ ] Main content area displays
- [ ] No console errors

**Step 4: Fix any issues**

If you encounter errors, fix them before proceeding.

---

### Task 31: Add loading states and error handling

**Files:**
- Modify: `src/shared/blocks/image-studio/main-content.tsx`
- Modify: `src/shared/blocks/image-studio/sidebar.tsx`

**Step 1: Add error display to main content**

```typescript
// Add to StudioMainContent component, after the header:

{error && (
  <div className="p-6">
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {error}
    </div>
  </div>
)}
```

**Step 2: Add retry button to sidebar**

```typescript
// Add to StudioSidebar component, in the header section:

{error && (
  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm text-red-700 mb-2">{error}</p>
    <Button variant="outline" size="sm" onClick={loadSKUs}>
      Retry
    </Button>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/shared/blocks/image-studio/main-content.tsx src/shared/blocks/image-studio/sidebar.tsx
git commit -m "feat(image-studio): add loading states and error handling"
```

---

### Task 32: Add keyboard shortcuts

**Files:**
- Create: `src/shared/blocks/image-studio/hooks/use-keyboard-shortcuts.ts`

**Step 1: Create the keyboard shortcuts hook**

```typescript
'use client';

import { useEffect } from 'react';
import { useImageStudio } from '@/shared/hooks/use-image-studio';

export function useKeyboardShortcuts() {
  const { openModal, closeModal, activeModal, searchQuery } = useImageStudio();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K - Focus search (would need ref)
      // Escape - Close modal
      if (e.key === 'Escape' && activeModal) {
        closeModal();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);
}
```

**Step 2: Use the hook in container**

```typescript
// Add to ImageStudioContainer:
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';

// Inside component:
useKeyboardShortcuts();
```

**Step 3: Commit**

```bash
git add src/shared/blocks/image-studio/hooks/use-keyboard-shortcuts.ts src/shared/blocks/image-studio/image-studio-container.tsx
git commit -m "feat(image-studio): add keyboard shortcuts"
```

---

### Task 33: Final verification and commit

**Files:** None (final check)

**Step 1: Run build to check for errors**

```bash
npm run build
```

**Step 2: Verify all TypeScript errors are resolved**

**Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(image-studio): final polish and fixes"
```

---

## Summary

This implementation plan covers:

1. **Phase 1: Foundation** - Types, API client, hooks, context, CSS, Next.js config
2. **Phase 2: Page Entry** - Main page component
3. **Phase 3: Core Components** - Container, header, sidebar, SKU list, main content, image grid, cards, batch footer
4. **Phase 4: Modals** - Settings, image operations, progress, download, upload
5. **Phase 5: API Routes** - Backend proxy routes
6. **Phase 6: Testing** - Load testing, error handling, keyboard shortcuts

**Total tasks:** 33

**Estimated time:** 4-6 hours for implementation

---

**Next Step:** Run this plan with `superpowers:executing-plans` or `superpowers:subagent-driven-development`
