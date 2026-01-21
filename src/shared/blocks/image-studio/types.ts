// SKU (Stock Keeping Unit) - represents a product with images to process
export interface SKU {
  id: string;
  article: string;
  status: SKUStatus;
  isMainImage: boolean;
  isApproved: boolean;
  thumbnail: string;
  createdAt: string;
  archived?: boolean;
  reviewStatus?: 'approved' | 'pending' | '';
  inputCount?: number;
  outputCount?: number;
  workflowStateId?: string;
}

export type SKUStatus = 'not_generated' | 'main_generated' | 'done';

// Image pair for before/after comparison
export interface ImagePair {
  id: string;
  stem: string;
  isMain: boolean;
  inputUrl: string;
  outputUrl: string | null;
  inputName?: string;
  outputName?: string;
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
  // Existing settings
  imageSize: ImageSize;
  imageFormat: ImageFormat;
  quality: number;
  preserveOriginal: boolean;

  // NEW: Prompt group fields
  prompt_groups?: PromptGroup[];
  active_prompt_group_id?: string;
  active_prompt_group_name?: string;
  use_english_prompts?: boolean;

  // NEW: Template fields (all 21 from GROUP_PROMPT_KEYS)
  prompt_common_cn?: string;
  prompt_main_cn?: string;
  prompt_secondary_cn?: string;
  style_main_prompt_cn?: string;
  style_extract_instruction_cn?: string;
  title_details_prompt_cn?: string;
  opt_remove_watermark_cn?: string;
  opt_remove_logo_cn?: string;
  opt_text_edit_cn?: string;
  opt_restructure_cn?: string;
  opt_recolor_cn?: string;
  opt_add_markers_cn?: string;
  prompt_common_en?: string;
  prompt_main_en?: string;
  prompt_secondary_en?: string;
  style_main_prompt_en?: string;
  style_extract_instruction_en?: string;
  title_details_prompt_en?: string;
  opt_remove_watermark_en?: string;
  opt_remove_logo_en?: string;
  opt_text_edit_en?: string;
  opt_restructure_en?: string;
  opt_recolor_en?: string;
  opt_add_markers_en?: string;
  pro_plan_instruction_cn?: string;
}

// NEW: Prompt group type
export interface PromptGroup {
  id: string;
  name: string;
}

export type ImageSize = '1024x1024' | '1536x1536' | '2048x2048';
export type ImageFormat = 'png' | 'jpg' | 'webp';

// Batch processing progress
export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  percentage: number;
  status: BatchStatus;
}

export type BatchStatus = 'idle' | 'processing' | 'completed' | 'paused' | 'error';

// Statistics for batch operations
export interface BatchStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
}

// Job for tracking individual operations
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
export type ModalType = 'image' | 'image-edit' | 'progress' | 'download' | 'settings' | 'opt-prompt' | 'upload' | null;

// Modal state
export interface ModalState {
  type: ModalType;
  data?: any;
}
