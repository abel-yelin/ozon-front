'use client';

import { createContext, ReactNode, useContext, useState, useCallback } from 'react';

import type {
  AiJobType,
  AiJobStatus,
  AiQuality,
  AiFormat,
  AiWorkflowState,
  BackgroundReplacementConfig,
  BatchOptimizationConfig,
  ImageEnhancementConfig,
} from '@/lib/api/ai-playground';

// ========================================
// Types
// ========================================

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  size: number;
  file?: File;
}

export interface JobProgress {
  jobId: string;
  status: AiJobStatus;
  progress: number;
  processed: number;
  total: number;
  currentImage?: string;
  message?: string;
}

export interface AiJobConfig {
  type: AiJobType;
  backgroundReplacement?: BackgroundReplacementConfig;
  batchOptimization?: BatchOptimizationConfig;
  imageEnhancement?: ImageEnhancementConfig;
}

interface ImagePair {
  id: string;
  sourceUrl: string;
  resultUrl?: string;
  approved: boolean;
  archived: boolean;
}

interface WorkflowState {
  id: string;
  name: string;
  state: AiWorkflowState;
  imagePairs: ImagePair[];
}

interface UserSettings {
  defaultQuality: AiQuality;
  defaultFormat: AiFormat;
  autoApprove: boolean;
  batchSize: number;
  notificationEnabled: boolean;
}

interface PromptTemplate {
  id: string;
  name: string;
  type: AiJobType;
  template: string;
  isDefault: boolean;
}

// ========================================
// Context Value
// ========================================

interface AiPlaygroundContextValue {
  // Upload state
  uploadedImages: UploadedImage[];
  setUploadedImages: (images: UploadedImage[]) => void;
  addUploadedImages: (images: UploadedImage[]) => void;
  removeUploadedImage: (id: string) => void;
  clearUploadedImages: () => void;

  // Job configuration
  jobConfig: AiJobConfig;
  setJobConfig: (config: AiJobConfig) => void;
  updateJobType: (type: AiJobType) => void;
  updateQuality: (quality: AiQuality) => void;
  updateFormat: (format: AiFormat) => void;

  // Job state
  currentJobId: string | null;
  setCurrentJobId: (jobId: string | null) => void;
  jobProgress: JobProgress | null;
  setJobProgress: (progress: JobProgress | null) => void;

  // Workflow state
  currentWorkflowId: string | null;
  setCurrentWorkflowId: (workflowId: string | null) => void;
  workflowStates: WorkflowState[];
  setWorkflowStates: (states: WorkflowState[]) => void;

  // User settings
  userSettings: UserSettings | null;
  setUserSettings: (settings: UserSettings) => void;

  // Prompt templates
  promptTemplates: PromptTemplate[];
  setPromptTemplates: (templates: PromptTemplate[]) => void;

  // UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedImagePairs: string[];
  setSelectedImagePairs: (ids: string[]) => void;
  toggleImagePairSelection: (id: string) => void;
  clearSelectedImagePairs: () => void;
}

const AiPlaygroundContext = createContext({} as AiPlaygroundContextValue);

// ========================================
// Hook
// ========================================

export const useAiPlayground = () => useContext(AiPlaygroundContext);

// ========================================
// Provider
// ========================================

const DEFAULT_CONFIG: AiJobConfig = {
  type: 'background_replacement',
  backgroundReplacement: {
    backgroundPrompt: '',
    negativePrompt: '',
    quality: 'standard',
    format: 'png',
  },
  batchOptimization: {
    quality: 'standard',
    format: 'webp',
    maxSize: 1920,
    maintainAspect: true,
  },
  imageEnhancement: {
    enhancementLevel: 5,
    sharpen: true,
    denoise: true,
    upscale: false,
  },
};

const DEFAULT_SETTINGS: UserSettings = {
  defaultQuality: 'standard',
  defaultFormat: 'png',
  autoApprove: false,
  batchSize: 10,
  notificationEnabled: true,
};

export const AiPlaygroundProvider = ({ children }: { children: ReactNode }) => {
  // Upload state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const addUploadedImages = useCallback((images: UploadedImage[]) => {
    setUploadedImages((prev) => [...prev, ...images]);
  }, []);

  const removeUploadedImage = useCallback((id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearUploadedImages = useCallback(() => {
    setUploadedImages([]);
  }, []);

  // Job configuration
  const [jobConfig, setJobConfig] = useState<AiJobConfig>(DEFAULT_CONFIG);

  const updateJobType = useCallback((type: AiJobType) => {
    setJobConfig((prev) => ({ ...prev, type }));
  }, []);

  const updateQuality = useCallback((quality: AiQuality) => {
    setJobConfig((prev) => ({
      ...prev,
      backgroundReplacement: prev.backgroundReplacement
        ? { ...prev.backgroundReplacement, quality }
        : undefined,
      batchOptimization: prev.batchOptimization
        ? { ...prev.batchOptimization, quality }
        : undefined,
    }));
  }, []);

  const updateFormat = useCallback((format: AiFormat) => {
    setJobConfig((prev) => ({
      ...prev,
      backgroundReplacement: prev.backgroundReplacement
        ? { ...prev.backgroundReplacement, format }
        : undefined,
      batchOptimization: prev.batchOptimization
        ? { ...prev.batchOptimization, format }
        : undefined,
    }));
  }, []);

  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);

  // Workflow state
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);

  // User settings
  const [userSettings, setUserSettings] = useState<UserSettings | null>(DEFAULT_SETTINGS);

  // Prompt templates
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState('process');
  const [selectedImagePairs, setSelectedImagePairs] = useState<string[]>([]);

  const toggleImagePairSelection = useCallback((id: string) => {
    setSelectedImagePairs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelectedImagePairs = useCallback(() => {
    setSelectedImagePairs([]);
  }, []);

  const value: AiPlaygroundContextValue = {
    // Upload state
    uploadedImages,
    setUploadedImages,
    addUploadedImages,
    removeUploadedImage,
    clearUploadedImages,

    // Job configuration
    jobConfig,
    setJobConfig,
    updateJobType,
    updateQuality,
    updateFormat,

    // Job state
    currentJobId,
    setCurrentJobId,
    jobProgress,
    setJobProgress,

    // Workflow state
    currentWorkflowId,
    setCurrentWorkflowId,
    workflowStates,
    setWorkflowStates,

    // User settings
    userSettings,
    setUserSettings,

    // Prompt templates
    promptTemplates,
    setPromptTemplates,

    // UI state
    activeTab,
    setActiveTab,
    selectedImagePairs,
    setSelectedImagePairs,
    toggleImagePairSelection,
    clearSelectedImagePairs,
  };

  return (
    <AiPlaygroundContext.Provider value={value}>
      {children}
    </AiPlaygroundContext.Provider>
  );
};
