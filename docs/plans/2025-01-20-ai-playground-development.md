# AI Playground Module - Development Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design document.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend API Specification](#backend-api-specification)
5. [Frontend Components](#frontend-components)
6. [State Management](#state-management)
7. [File Storage Strategy](#file-storage-strategy)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Purpose

Integrate the AI-powered image processing system from the demo (`dev/ozon-backen/demo2`) into the existing dashboard framework. The system enables batch AI image generation and optimization for e-commerce product images, specifically designed for Ozon marketplace.

### Core Features

1. **Image Processing Pipeline**
   - AI-powered background replacement and optimization
   - Multiple processing modes (main image, secondary images, batch optimization)
   - Support for Russian text preservation in images
   - Reference image upload for style matching

2. **Workflow Management**
   - Three-state workflow: Pending → Approved → Archived
   - Step-by-step review with approve/reject actions
   - Batch operations for multiple SKUs
   - Job queue management with cancellation support

3. **Configuration & Prompts**
   - Customizable prompt templates for different image types
   - Professional mode with advanced instructions
   - Multi-language support (Chinese/Russian)
   - API endpoint and model configuration

4. **Download & History**
   - Shop-specific batch downloads
   - Job history with detailed logs
   - Progress tracking and statistics

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 + React | UI framework |
| Frontend | shadcn/ui | Component library |
| Frontend | React Query / SWR | Server state management |
| Frontend | Zustand / Context | Client state management |
| Backend | FastAPI (Python) | API server |
| Backend | Celery / asyncio | Job queue processing |
| Database | PostgreSQL + Drizzle ORM | Data persistence |
| Storage | S3-compatible / Local | Image file storage |
| AI | External LLM API | Image generation |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Pages      │  │ Components   │  │    Hooks     │         │
│  │              │  │              │  │              │         │
│  │ - Processing │  │ - ImagePair  │  │ - useJobs    │         │
│  │ - Review     │  │ - SkuList    │  │ - useUpload  │         │
│  │ - History    │  │ - Progress   │  │ - useReview  │         │
│  │ - Settings   │  │ - Modals     │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│          │                    │                    │            │
│          └────────────────────┴────────────────────┘            │
│                               │                                 │
│                        ┌──────▼──────┐                          │
│                        │ API Layer   │                          │
│                        │ (fetch/axios)│                         │
│                        └──────┬──────┘                          │
└───────────────────────────────┼────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FastAPI Routes                         │  │
│  │                                                           │  │
│  │  /api/ai-playground/jobs          - Job CRUD              │  │
│  │  /api/ai-playground/workflow      - Approval workflow     │  │
│  │  /api/ai-playground/folders       - SKU management        │  │
│  │  /api/ai-playground/settings      - Configuration         │  │
│  │  /api/ai-playground/upload        - File upload           │  │
│  │  /api/ai-playground/download      - Batch download        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               │                                 │
│  ┌───────────────────────────┴─────────────────────────────┐   │
│  │                    Service Layer                         │   │
│  │                                                           │   │
│  │  - JobService           - Job queue management            │   │
│  │  - ImageProcessingService - AI image generation          │   │
│  │  - WorkflowService      - Approval state management      │   │
│  │  - StorageService       - File operations                │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  PostgreSQL   │     │   File Store  │     │ External AI   │
│               │     │               │     │   API         │
│ - Jobs        │     │ - Images      │     │ - Image Gen   │
│ - Workflow    │     │ - Uploads     │     │ - Models      │
│ - Settings    │     │ - Archives    │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Route Structure

```
src/app/[locale]/(user)/dashboard/aiplayground/
├── page.tsx                    # Main processing interface
├── review/
│   └── page.tsx               # Step-by-step review workflow
├── history/
│   └── page.tsx               # Job history and logs
└── settings/
    └── page.tsx               # AI Playground settings
```

### URL Mapping

| Demo Route | New Route | Purpose |
|------------|-----------|---------|
| (root view) | `/dashboard/aiplayground` | Main processing interface |
| N/A | `/dashboard/aiplayground/review` | Review workflow |
| (history tab) | `/dashboard/aiplayground/history` | Job history |
| (settings modal) | `/dashboard/aiplayground/settings` | Settings page |

---

## Database Schema

### New Tables

```sql
-- AI Jobs Table
CREATE TABLE ai_job (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'main_image', 'secondary_image', 'batch_optimize', 'custom'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 0,

  -- Input configuration
  input_data JSONB NOT NULL, -- SKU list, folder paths, etc.
  prompt_template_id TEXT,

  -- Output data
  result_data JSONB, -- Generated image URLs, metadata
  error_message TEXT,

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_completion_at TIMESTAMP,

  -- Indexes
  INDEX idx_ai_job_user (user_id),
  INDEX idx_ai_job_status (status),
  INDEX idx_ai_job_created (created_at DESC)
);

-- AI Job Logs Table
CREATE TABLE ai_job_log (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES ai_job(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- 'info', 'warning', 'error', 'debug'
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),

  INDEX idx_ai_job_log_job (job_id),
  INDEX idx_ai_job_log_timestamp (timestamp)
);

-- AI Workflow State Table
CREATE TABLE ai_workflow_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  folder_name TEXT NOT NULL,

  -- State tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'archived'
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,

  -- Image pairs data
  image_pairs JSONB, -- Array of {input_path, output_path, status, skip_reason}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  archived_at TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, sku),
  INDEX idx_ai_workflow_user (user_id),
  INDEX idx_ai_workflow_status (status),
  INDEX idx_ai_workflow_sku (sku)
);

-- AI Image Pairs Table
CREATE TABLE ai_image_pair (
  id TEXT PRIMARY KEY,
  workflow_state_id TEXT REFERENCES ai_workflow_state(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES ai_job(id) ON DELETE SET NULL,

  -- Image data
  input_image_url TEXT NOT NULL,
  output_image_url TEXT,
  input_storage_key TEXT NOT NULL,
  output_storage_key TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'skipped', 'failed'
  skip_reason TEXT,
  is_main_image BOOLEAN DEFAULT FALSE,

  -- Metadata
  image_type TEXT, -- 'main', 'secondary', 'detail'
  generation_params JSONB, -- Prompt, model, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_ai_image_pair_workflow (workflow_state_id),
  INDEX idx_ai_image_pair_job (job_id),
  INDEX idx_ai_image_pair_status (status)
);

-- AI Prompt Templates Table
CREATE TABLE ai_prompt_template (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE, -- NULL for system templates
  group_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,

  -- Template content
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  system_prompt TEXT,

  -- Configuration
  model TEXT NOT NULL,
  api_endpoint TEXT,
  parameters JSONB, -- Temperature, max_tokens, etc.

  -- Organization
  is_active BOOLEAN DEFAULT TRUE,
  is_professional BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_ai_prompt_template_user (user_id),
  INDEX idx_ai_prompt_template_group (group_name)
);

-- AI User Settings Table
CREATE TABLE ai_user_setting (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES user(id) ON DELETE CASCADE,

  -- API Configuration
  api_endpoint TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted
  default_model TEXT NOT NULL,
  max_concurrent_jobs INTEGER DEFAULT 3,

  -- Processing defaults
  default_prompt_template_id TEXT,
  enable_professional_mode BOOLEAN DEFAULT FALSE,
  consistency_mode BOOLEAN DEFAULT TRUE,

  -- UI Preferences
  default_view TEXT DEFAULT 'continuous', -- 'continuous', 'step_review'
  items_per_page INTEGER DEFAULT 50,
  auto_advance BOOLEAN DEFAULT TRUE,

  -- Storage
  storage_provider TEXT DEFAULT 'local', -- 'local', 's3', 'oss'
  storage_config JSONB, -- Bucket, region, etc.

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Download Queue Table
CREATE TABLE ai_download_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES ai_job(id) ON DELETE CASCADE,

  -- Download info
  shop_name TEXT NOT NULL,
  sku_list TEXT[] NOT NULL, -- Array of SKUs
  image_type TEXT NOT NULL, -- 'main', 'secondary', 'all'

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,

  -- Output
  download_url TEXT, -- Presigned URL or archive path
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  INDEX idx_ai_download_user (user_id),
  INDEX idx_ai_download_status (status)
);
```

### Drizzle Schema Definition

```typescript
// src/config/db/schema.postgres.ts

import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { user } from './user';

export const aiJob = pgTable('ai_job', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull(), // 'main_image', 'secondary_image', 'batch_optimize', 'custom'
  status: text('status').notNull().default('pending'),
  priority: integer('priority').default(0),

  inputData: jsonb('input_data').notNull(),
  promptTemplateId: text('prompt_template_id').references(() => aiPromptTemplate.id),

  resultData: jsonb('result_data'),
  errorMessage: text('error_message'),

  totalItems: integer('total_items').default(0),
  processedItems: integer('processed_items').default(0),
  failedItems: integer('failed_items').default(0),
  progressPercentage: integer('progress_percentage').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  estimatedCompletionAt: timestamp('estimated_completion_at'),
}, (table) => [
  index('idx_ai_job_user').on(table.userId),
  index('idx_ai_job_status').on(table.status),
  index('idx_ai_job_created').on(table.createdAt),
]);

export const aiJobLog = pgTable('ai_job_log', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => aiJob.id, { onDelete: 'cascade' }),
  level: text('level').notNull(), // 'info', 'warning', 'error', 'debug'
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_ai_job_log_job').on(table.jobId),
  index('idx_ai_job_log_timestamp').on(table.timestamp),
]);

export const aiWorkflowState = pgTable('ai_workflow_state', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  folderName: text('folder_name').notNull(),

  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'archived'
  currentStep: integer('current_step').default(0),
  totalSteps: integer('total_steps').default(0),

  imagePairs: jsonb('image_pairs'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  archivedAt: timestamp('archived_at'),
}, (table) => [
  uniqueIndex('idx_ai_workflow_user_sku').on(table.userId, table.sku),
  index('idx_ai_workflow_user').on(table.userId),
  index('idx_ai_workflow_status').on(table.status),
  index('idx_ai_workflow_sku').on(table.sku),
]);

export const aiImagePair = pgTable('ai_image_pair', {
  id: text('id').primaryKey(),
  workflowStateId: text('workflow_state_id').references(() => aiWorkflowState.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => aiJob.id, { onDelete: 'set null' }),

  inputImageUrl: text('input_image_url').notNull(),
  outputImageUrl: text('output_image_url'),
  inputStorageKey: text('input_storage_key').notNull(),
  outputStorageKey: text('output_storage_key'),

  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'skipped', 'failed'
  skipReason: text('skip_reason'),
  isMainImage: boolean('is_main_image').default(false),

  imageType: text('image_type'), // 'main', 'secondary', 'detail'
  generationParams: jsonb('generation_params'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_ai_image_pair_workflow').on(table.workflowStateId),
  index('idx_ai_image_pair_job').on(table.jobId),
  index('idx_ai_image_pair_status').on(table.status),
]);

export const aiPromptTemplate = pgTable('ai_prompt_template', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  groupName: text('group_name').notNull(),
  templateName: text('template_name').notNull(),
  description: text('description'),

  prompt: text('prompt').notNull(),
  negativePrompt: text('negative_prompt'),
  systemPrompt: text('system_prompt'),

  model: text('model').notNull(),
  apiEndpoint: text('api_endpoint'),
  parameters: jsonb('parameters'),

  isActive: boolean('is_active').default(true),
  isProfessional: boolean('is_professional').default(false),
  sortOrder: integer('sort_order').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_ai_prompt_template_user').on(table.userId),
  index('idx_ai_prompt_template_group').on(table.group_name),
]);

export const aiUserSetting = pgTable('ai_user_setting', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),

  apiEndpoint: text('api_endpoint').notNull(),
  apiKey: text('api_key').notNull(), // Encrypted
  defaultModel: text('default_model').notNull(),
  maxConcurrentJobs: integer('max_concurrent_jobs').default(3),

  defaultPromptTemplateId: text('default_prompt_template_id').references(() => aiPromptTemplate.id),
  enableProfessionalMode: boolean('enable_professional_mode').default(false),
  consistencyMode: boolean('consistency_mode').default(true),

  defaultView: text('default_view').default('continuous'), // 'continuous', 'step_review'
  itemsPerPage: integer('items_per_page').default(50),
  autoAdvance: boolean('auto_advance').default(true),

  storageProvider: text('storage_provider').default('local'), // 'local', 's3', 'oss'
  storageConfig: jsonb('storage_config'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiDownloadQueue = pgTable('ai_download_queue', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => aiJob.id, { onDelete: 'cascade' }),

  shopName: text('shop_name').notNull(),
  skuList: jsonb('sku_list').notNull().$type<string[]>(),
  imageType: text('image_type').notNull(), // 'main', 'secondary', 'all'

  status: text('status').notNull().default('pending'),
  progress: integer('progress').default(0),

  downloadUrl: text('download_url'),
  fileCount: integer('file_count').default(0),
  totalSize: integer('total_size').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('idx_ai_download_user').on(table.userId),
  index('idx_ai_download_status').on(table.status),
]);

// Relations
export const aiJobRelations = relations(aiJob, ({ many, one }) => ({
  logs: many(aiJobLog),
  imagePairs: many(aiImagePair),
  promptTemplate: one(aiPromptTemplate, {
    fields: [aiJob.promptTemplateId],
    references: [aiPromptTemplate.id],
  }),
}));

export const aiWorkflowStateRelations = relations(aiWorkflowState, ({ many }) => ({
  imagePairs: many(aiImagePair),
}));

export const aiImagePairRelations = relations(aiImagePair, ({ one }) => ({
  workflowState: one(aiWorkflowState, {
    fields: [aiImagePair.workflowStateId],
    references: [aiWorkflowState.id],
  }),
  job: one(aiJob, {
    fields: [aiImagePair.jobId],
    references: [aiJob.id],
  }),
}));
```

---

## Backend API Specification

### Base Path

All AI Playground endpoints are prefixed with `/api/ai-playground`

### Authentication

All endpoints require authentication via session cookie (same as existing Ozon endpoints).

---

### Jobs API

#### POST `/api/ai-playground/jobs`

Create a new AI image processing job.

**Request Body:**
```typescript
{
  jobType: 'main_image' | 'secondary_image' | 'batch_optimize' | 'custom';
  input: {
    skus: string[];                    // List of SKUs to process
    folderName?: string;               // Optional folder filter
    imageType?: 'main' | 'secondary' | 'all';
  };
  options?: {
    promptTemplateId?: string;
    customPrompt?: string;
    model?: string;
    priority?: number;
    maxConcurrent?: number;
  };
}
```

**Response:**
```typescript
{
  code: 0;
  data: {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalItems: number;
    estimatedCompletionTime: string; // ISO timestamp
  };
}
```

#### GET `/api/ai-playground/jobs`

List jobs for current user with pagination and filtering.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional filter)
- `jobType` (optional filter)

**Response:**
```typescript
{
  code: 0;
  data: {
    items: Array<{
      id: string;
      jobType: string;
      status: string;
      totalItems: number;
      processedItems: number;
      failedItems: number;
      progressPercentage: number;
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
}
```

#### GET `/api/ai-playground/jobs/:jobId`

Get detailed job information.

**Response:**
```typescript
{
  code: 0;
  data: {
    id: string;
    jobType: string;
    status: string;
    inputData: any;
    resultData?: any;
    errorMessage?: string;
    progress: {
      total: number;
      processed: number;
      failed: number;
      percentage: number;
    };
    timeline: {
      createdAt: string;
      startedAt?: string;
      completedAt?: string;
      estimatedCompletionAt?: string;
    };
  };
}
```

#### POST `/api/ai-playground/jobs/:jobId/cancel`

Cancel a running or pending job.

**Response:**
```typescript
{
  code: 0;
  data: {
    jobId: string;
    status: 'cancelled';
  };
}
```

#### GET `/api/ai-playground/jobs/:jobId/logs`

Get job execution logs with streaming support.

**Query Parameters:**
- `level` (optional filter: 'info', 'warning', 'error', 'debug')
- `limit` (default: 100)
- `since` (optional timestamp for incremental fetch)

**Response:**
```typescript
{
  code: 0;
  data: {
    logs: Array<{
      id: string;
      level: string;
      message: string;
      timestamp: string;
    }>;
    hasMore: boolean;
  };
}
```

#### GET `/api/ai-playground/jobs/:jobId/stream`

Server-Sent Events endpoint for real-time log streaming.

**Response:** `text/event-stream`

```
data: {"type":"log","level":"info","message":"Processing SKU: ABC123","timestamp":"2025-01-20T10:00:00Z"}

data: {"type":"progress","current":5,"total":10,"percentage":50}

data: {"type":"complete","jobId":"job-123","status":"completed"}
```

---

### Workflow API

#### GET `/api/ai-playground/workflow`

Get workflow states with filtering.

**Query Parameters:**
- `status` (optional: 'pending', 'approved', 'archived')
- `search` (SKU search term)
- `page` (default: 1)
- `limit` (default: 50)

**Response:**
```typescript
{
  code: 0;
  data: {
    items: Array<{
      id: string;
      sku: string;
      folderName: string;
      status: string;
      currentStep: number;
      totalSteps: number;
      imagePairs: Array<{
        id: string;
        inputImageUrl: string;
        outputImageUrl?: string;
        status: string;
        isMainImage: boolean;
      }>;
      createdAt: string;
      updatedAt: string;
      approvedAt?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
}
```

#### POST `/api/ai-playground/workflow/approve`

Approve or reject workflow items (SKUs or individual image pairs).

**Request Body:**
```typescript
{
  actions: Array<{
    type: 'approve' | 'reject';
    targetId: string; // workflow_state_id or image_pair_id
    targetType: 'sku' | 'image_pair';
    reason?: string;
  }>;
}
```

**Response:**
```typescript
{
  code: 0;
  data: {
    processed: number;
    results: Array<{
      targetId: string;
      success: boolean;
      newStatus?: string;
      error?: string;
    }>;
  };
}
```

#### POST `/api/ai-playground/workflow/archive`

Archive approved workflow items.

**Request Body:**
```typescript
{
  workflowStateIds: string[];
}
```

**Response:**
```typescript
{
  code: 0;
  data: {
    archived: number;
    ids: string[];
  };
}
```

#### GET `/api/ai-playground/workflow/:sku`

Get detailed workflow state for a specific SKU.

**Response:**
```typescript
{
  code: 0;
  data: {
    id: string;
    sku: string;
    folderName: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    imagePairs: Array<{
      id: string;
      inputImageUrl: string;
      outputImageUrl?: string;
      inputStorageKey: string;
      outputStorageKey?: string;
      status: string;
      skipReason?: string;
      isMainImage: boolean;
      imageType: string;
      generationParams?: any;
      createdAt: string;
      updatedAt: string;
    }>;
    timeline: {
      createdAt: string;
      updatedAt: string;
      approvedAt?: string;
      archivedAt?: string;
    };
  };
}
```

---

### Folders & Images API

#### GET `/api/ai-playground/folders`

List available SKU folders.

**Query Parameters:**
- `search` (optional search term)
- `status` (optional filter)
- `hasImages` (boolean filter)

**Response:**
```typescript
{
  code: 0;
  data: {
    folders: Array<{
      sku: string;
      folderName: string;
      imageCount: number;
      processedCount: number;
      status?: string;
      lastModified: string;
    }>;
  };
}
```

#### GET `/api/ai-playground/folders/:sku/pairs`

Get image pairs for a specific SKU.

**Query Parameters:**
- `includeSkipped` (default: false)

**Response:**
```typescript
{
  code: 0;
  data: {
    sku: string;
    pairs: Array<{
      id: string;
      inputImageUrl: string;
      outputImageUrl?: string;
      status: string;
      isMainImage: boolean;
      skipReason?: string;
    }>;
  };
}
```

#### POST `/api/ai-playground/upload/reference`

Upload a reference image for style matching.

**Request:** `multipart/form-data`
- `file`: Image file
- `sku`: Associated SKU (optional)

**Response:**
```typescript
{
  code: 0;
  data: {
    uploadId: string;
    storageKey: string;
    url: string;
    thumbnailUrl: string;
  };
}
```

#### DELETE `/api/ai-playground/files`

Delete uploaded files or generated images.

**Request Body:**
```typescript
{
  fileIds: string[];
  deleteFromStorage: boolean; // Also delete from storage provider
}
```

**Response:**
```typescript
{
  code: 0;
  data: {
    deleted: number;
    failed: number;
  };
}
```

---

### Settings API

#### GET `/api/ai-playground/settings`

Get user's AI Playground settings.

**Response:**
```typescript
{
  code: 0;
  data: {
    id: string;
    userId: string;

    // API Configuration
    apiEndpoint: string;
    defaultModel: string;
    maxConcurrentJobs: number;
    // apiKey is NOT returned for security

    // Processing defaults
    defaultPromptTemplateId?: string;
    enableProfessionalMode: boolean;
    consistencyMode: boolean;

    // UI Preferences
    defaultView: string;
    itemsPerPage: number;
    autoAdvance: boolean;

    // Storage
    storageProvider: string;
    storageConfig?: any;

    // Timestamps
    createdAt: string;
    updatedAt: string;
  };
}
```

#### PUT `/api/ai-playground/settings`

Update user's AI Playground settings.

**Request Body:**
```typescript
{
  // All fields optional
  apiEndpoint?: string;
  apiKey?: string; // Will be encrypted
  defaultModel?: string;
  maxConcurrentJobs?: number;
  defaultPromptTemplateId?: string;
  enableProfessionalMode?: boolean;
  consistencyMode?: boolean;
  defaultView?: string;
  itemsPerPage?: number;
  autoAdvance?: boolean;
  storageProvider?: string;
  storageConfig?: any;
}
```

**Response:**
```typescript
{
  code: 0;
  data: { /* Updated settings object */ };
}
```

---

### Prompt Templates API

#### GET `/api/ai-playground/prompts`

List prompt templates.

**Query Parameters:**
- `group` (optional filter)
- `isProfessional` (boolean filter)

**Response:**
```typescript
{
  code: 0;
  data: {
    groups: Array<{
      groupName: string;
      templates: Array<{
        id: string;
        templateName: string;
        description?: string;
        model: string;
        isProfessional: boolean;
        isActive: boolean;
        sortOrder: number;
      }>;
    }>;
  };
}
```

#### GET `/api/ai-playground/prompts/:templateId`

Get detailed prompt template.

**Response:**
```typescript
{
  code: 0;
  data: {
    id: string;
    groupName: string;
    templateName: string;
    description?: string;
    prompt: string;
    negativePrompt?: string;
    systemPrompt?: string;
    model: string;
    apiEndpoint?: string;
    parameters?: any;
    isProfessional: boolean;
  };
}
```

#### POST `/api/ai-playground/prompts`

Create a custom prompt template (user-scoped).

**Request Body:**
```typescript
{
  groupName: string;
  templateName: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  systemPrompt?: string;
  model: string;
  apiEndpoint?: string;
  parameters?: any;
  isProfessional?: boolean;
}
```

#### PUT `/api/ai-playground/prompts/:templateId`

Update a prompt template (only user's own templates).

#### DELETE `/api/ai-playground/prompts/:templateId`

Delete a custom prompt template (only user's own templates).

---

### Download API

#### POST `/api/ai-playground/download`

Create a batch download job.

**Request Body:**
```typescript
{
  shopName: string;
  skus: string[];
  imageType: 'main' | 'secondary' | 'all';
  format?: 'zip' | 'tar';
  compression?: 'store' | 'fast' | 'normal' | 'max';
}
```

**Response:**
```typescript
{
  code: 0;
  data: {
    downloadId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    estimatedFiles: number;
    estimatedSize: number;
  };
}
```

#### GET `/api/ai-playground/download/:downloadId`

Get download status.

**Response:**
```typescript
{
  code: 0;
  data: {
    id: string;
    status: string;
    progress: number;
    downloadUrl?: string; // Presigned URL when ready
    fileCount: number;
    totalSize: number;
    createdAt: string;
    completedAt?: string;
  };
}
```

---

### System API

#### GET `/api/ai-playground/status`

Get system status and statistics.

**Response:**
```typescript
{
  code: 0;
  data: {
    systemStatus: 'operational' | 'degraded' | 'down';
    activeJobs: number;
    queuedJobs: number;
    completedToday: number;
    failedToday: number;
    avgProcessingTime: number; // seconds
    storageUsed: number; // bytes
    storageLimit: number; // bytes
  };
}
```

#### POST `/api/ai-playground/reload`

Reload configuration (admin only).

---

## Frontend Components

### Component Structure

```
src/shared/blocks/ai-playground/
├── components/
│   ├── sku-list.tsx              # SKU selection sidebar
│   ├── image-pair.tsx            # Input/output image comparison
│   ├── image-pair-grid.tsx       # Grid view of image pairs
│   ├── progress-modal.tsx        # Job progress monitoring
│   ├── processing-options.tsx    # Job configuration form
│   ├── review-workflow.tsx       # Step-by-step review interface
│   ├── batch-actions.tsx         # Bulk operation controls
│   ├── prompt-editor.tsx         # Prompt template editor
│   ├── download-manager.tsx      # Download queue management
│   └── history-table.tsx         # Job history table
├── hooks/
│   ├── use-ai-jobs.ts           # Job management
│   ├── use-ai-workflow.ts       # Workflow state
│   ├── use-ai-settings.ts       # Settings management
│   ├── use-ai-upload.ts         # File upload
│   └── use-ai-stream.ts         # SSE log streaming
├── lib/
│   ├── api-client.ts            # API wrapper
│   ├── types.ts                 # TypeScript types
│   └── constants.ts             # Constants and enums
└── ai-playground-layout.tsx     # Shared layout
```

### Core Components

#### 1. SkuList Component

```typescript
// src/shared/blocks/ai-playground/components/sku-list.tsx

interface SkuListProps {
  skus: Array<{
    sku: string;
    folderName: string;
    imageCount: number;
    processedCount: number;
    status?: 'pending' | 'approved' | 'archived';
  }>;
  selectedSkus: Set<string>;
  onSelect: (sku: string) => void;
  onBatchSelect: (skus: string[]) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  statusFilter: 'all' | 'pending' | 'approved' | 'archived';
  onStatusFilterChange: (filter: string) => void;
  loading?: boolean;
}

export function SkuList({
  skus,
  selectedSkus,
  onSelect,
  onBatchSelect,
  filter,
  onFilterChange,
  statusFilter,
  onStatusFilterChange,
  loading,
}: SkuListProps) {
  const [searchInput, setSearchInput] = useState('');

  const filteredSkus = useMemo(() => {
    return skus.filter(sku => {
      const matchesSearch = sku.sku.toLowerCase().includes(searchInput.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sku.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [skus, searchInput, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 border-b space-y-3">
        <Input
          placeholder="Search SKUs..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Actions */}
      <div className="p-4 border-b flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBatchSelect(filteredSkus.map(s => s.sku))}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBatchSelect([])}
        >
          Clear
        </Button>
      </div>

      {/* SKU List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {filteredSkus.map(sku => (
              <SkuListItem
                key={sku.sku}
                sku={sku}
                selected={selectedSkus.has(sku.sku)}
                onClick={() => onSelect(sku.sku)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkuListItem({
  sku,
  selected,
  onClick,
}: {
  sku: SkuListProps['skus'][0];
  selected: boolean;
  onClick: () => void;
}) {
  const progress = sku.imageCount > 0
    ? Math.round((sku.processedCount / sku.imageCount) * 100)
    : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer',
        selected && 'bg-muted'
      )}
      onClick={onClick}
    >
      <Checkbox checked={selected} onChange={onClick} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{sku.sku}</p>
        <p className="text-sm text-muted-foreground">
          {sku.processedCount}/{sku.imageCount} images
        </p>
      </div>
      <div className="flex items-center gap-2">
        {sku.status && (
          <Badge variant={
            sku.status === 'approved' ? 'default' :
            sku.status === 'archived' ? 'secondary' :
            'outline'
          }>
            {sku.status}
          </Badge>
        )}
        <Progress value={progress} className="w-16" />
      </div>
    </div>
  );
}
```

#### 2. ImagePair Component

```typescript
// src/shared/blocks/ai-playground/components/image-pair.tsx

interface ImagePairProps {
  inputUrl: string;
  outputUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';
  skipReason?: string;
  isMainImage?: boolean;
  onSkip?: () => void;
  onRegenerate?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ImagePair({
  inputUrl,
  outputUrl,
  status,
  skipReason,
  isMainImage = false,
  onSkip,
  onRegenerate,
  onApprove,
  onReject,
}: ImagePairProps) {
  const [inputZoomed, setInputZoomed] = useState(false);
  const [outputZoomed, setOutputZoomed] = useState(false);

  return (
    <div className="relative group">
      {/* Main Image Badge */}
      {isMainImage && (
        <Badge className="absolute top-2 left-2 z-10">
          Main Image
        </Badge>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Input Image */}
        <div className="relative aspect-square">
          <img
            src={inputUrl}
            alt="Input"
            className={cn(
              'w-full h-full object-cover rounded-lg cursor-pointer',
              'transition-transform hover:scale-105'
            )}
            onClick={() => setInputZoomed(true)}
          />
          {inputZoomed && (
            <ImageViewer
              src={inputUrl}
              alt="Input"
              onClose={() => setInputZoomed(false)}
            />
          )}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Original
          </div>
        </div>

        {/* Output Image */}
        <div className="relative aspect-square">
          {status === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {status === 'pending' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Waiting...</span>
            </div>
          )}
          {status === 'skipped' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {skipReason || 'Skipped'}
              </span>
            </div>
          )}
          {status === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          )}
          {outputUrl && status === 'completed' && (
            <>
              <img
                src={outputUrl}
                alt="Output"
                className={cn(
                  'w-full h-full object-cover rounded-lg cursor-pointer',
                  'transition-transform hover:scale-105'
                )}
                onClick={() => setOutputZoomed(true)}
              />
              {outputZoomed && (
                <ImageViewer
                  src={outputUrl}
                  alt="Output"
                  onClose={() => setOutputZoomed(false)}
                />
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Generated
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {status === 'completed' && (
          <>
            {onApprove && (
              <Button size="sm" variant="default" onClick={onApprove}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            )}
          </>
        )}
        {status === 'failed' && onRegenerate && (
          <Button size="sm" variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Regenerate
          </Button>
        )}
        {(status === 'pending' || status === 'processing') && onSkip && (
          <Button size="sm" variant="ghost" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" />
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### 3. ProcessingOptions Component

```typescript
// src/shared/blocks/ai-playground/components/processing-options.tsx

interface ProcessingOptionsProps {
  promptTemplates: PromptTemplate[];
  selectedTemplate?: string;
  onTemplateChange: (templateId: string) => void;
  customPrompt?: string;
  onCustomPromptChange: (prompt: string) => void;
  jobType: 'main_image' | 'secondary_image' | 'batch_optimize' | 'custom';
  onJobTypeChange: (type: ProcessingOptionsProps['jobType']) => void;
  enableProfessionalMode: boolean;
  onProfessionalModeChange: (enabled: boolean) => void;
  consistencyMode: boolean;
  onConsistencyModeChange: (enabled: boolean) => void;
  onStart: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ProcessingOptions({
  promptTemplates,
  selectedTemplate,
  onTemplateChange,
  customPrompt,
  onCustomPromptChange,
  jobType,
  onJobTypeChange,
  enableProfessionalMode,
  onProfessionalModeChange,
  consistencyMode,
  onConsistencyModeChange,
  onStart,
  loading,
  disabled,
}: ProcessingOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Job Type Selection */}
        <div className="space-y-2">
          <Label>Processing Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'main_image', label: 'Main Image', icon: 'Image' },
              { value: 'secondary_image', label: 'Secondary Images', icon: 'Copy' },
              { value: 'batch_optimize', label: 'Batch Optimize', icon: 'Zap' },
              { value: 'custom', label: 'Custom', icon: 'Settings' },
            ].map(type => (
              <Button
                key={type.value}
                variant={jobType === type.value ? 'default' : 'outline'}
                onClick={() => onJobTypeChange(type.value as any)}
                className="justify-start"
                disabled={disabled}
              >
                <SmartIcon name={type.icon} className="h-4 w-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Prompt Template */}
        <div className="space-y-2">
          <Label>Prompt Template</Label>
          <Select value={selectedTemplate} onValueChange={onTemplateChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {promptTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.templateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label>Custom Prompt (Optional)</Label>
          <Textarea
            placeholder="Add custom instructions..."
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            disabled={disabled}
            rows={3}
          />
        </div>

        {/* Advanced Options */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Professional Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use advanced prompts for higher quality
              </p>
            </div>
            <Switch
              checked={enableProfessionalMode}
              onCheckedChange={onProfessionalModeChange}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Consistency Mode</Label>
              <p className="text-xs text-muted-foreground">
                Maintain visual consistency across images
              </p>
            </div>
            <Switch
              checked={consistencyMode}
              onCheckedChange={onConsistencyModeChange}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStart}
          disabled={disabled || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Processing
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Custom Hooks

#### useAiJobs Hook

```typescript
// src/shared/blocks/ai-playground/hooks/use-ai-jobs.ts

interface UseAiJobsOptions {
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useAiJobs(options?: UseAiJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-playground/jobs');
      const data = await response.json();
      if (data.code === 0) {
        setJobs(data.data.items);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.enabled === false) return;

    fetchJobs();
    const interval = setInterval(fetchJobs, options?.pollInterval || 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, options?.enabled, options?.pollInterval]);

  const createJob = useCallback(async (input: CreateJobInput) => {
    const response = await fetch('/api/ai-playground/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (data.code === 0) {
      await fetchJobs();
      return data.data;
    }
    throw new Error(data.message);
  }, [fetchJobs]);

  const cancelJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/ai-playground/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
    const data = await response.json();
    if (data.code === 0) {
      await fetchJobs();
      return data.data;
    }
    throw new Error(data.message);
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    createJob,
    cancelJob,
  };
}
```

#### useAiStream Hook (SSE)

```typescript
// src/shared/blocks/ai-playground/hooks/use-ai-stream.ts

export function useAiStream(jobId: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/ai-playground/jobs/${jobId}/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setLogs(prev => [...prev, data]);
    });

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setProgress(prev => ({ ...prev, ...data }));
      setConnected(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { logs, progress, connected };
}
```

---

## State Management

### Server State (React Query)

```typescript
// src/shared/blocks/ai-playground/lib/query-client.ts

import { QueryClient } from '@tanstack/react-query';

export const aiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys factory
export const aiQueryKeys = {
  jobs: {
    all: ['ai-jobs'] as const,
    lists: () => [...aiQueryKeys.jobs.all, 'list'] as const,
    list: (filters: JobFilters) => [...aiQueryKeys.jobs.lists(), filters] as const,
    details: () => [...aiQueryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...aiQueryKeys.jobs.details(), id] as const,
  },
  workflow: {
    all: ['ai-workflow'] as const,
    lists: () => [...aiQueryKeys.workflow.all, 'list'] as const,
    list: (filters: WorkflowFilters) => [...aiQueryKeys.workflow.lists(), filters] as const,
    details: () => [...aiQueryKeys.workflow.all, 'detail'] as const,
    detail: (sku: string) => [...aiQueryKeys.workflow.details(), sku] as const,
  },
  settings: ['ai-settings'] as const,
  prompts: ['ai-prompts'] as const,
} as const;
```

### Client State (Zustand)

```typescript
// src/shared/blocks/ai-playground/lib/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiPlaygroundState {
  // Selection state
  selectedSkus: Set<string>;
  toggleSku: (sku: string) => void;
  clearSelection: () => void;
  selectAll: (skus: string[]) => void;

  // UI state
  currentView: 'continuous' | 'step_review';
  setCurrentView: (view: 'continuous' | 'step_review') => void;

  currentSku: string | null;
  setCurrentSku: (sku: string | null) => void;

  // Filters
  statusFilter: 'all' | 'pending' | 'approved' | 'archived';
  setStatusFilter: (filter: string) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Processing options
  processingOptions: {
    jobType: 'main_image' | 'secondary_image' | 'batch_optimize' | 'custom';
    templateId?: string;
    customPrompt?: string;
    professionalMode: boolean;
    consistencyMode: boolean;
  };
  setProcessingOptions: (options: Partial<AiPlaygroundState['processingOptions']>) => void;

  // Review state
  reviewMode: {
    currentIndex: number;
    autoAdvance: boolean;
  };
  setReviewMode: (options: Partial<AiPlaygroundState['reviewMode']>) => void;
}

export const useAiPlaygroundStore = create<AiPlaygroundState>()(
  persist(
    (set, get) => ({
      // Selection
      selectedSkus: new Set(),
      toggleSku: (sku) =>
        set((state) => {
          const newSet = new Set(state.selectedSkus);
          if (newSet.has(sku)) {
            newSet.delete(sku);
          } else {
            newSet.add(sku);
          }
          return { selectedSkus: newSet };
        }),
      clearSelection: () => set({ selectedSkus: new Set() }),
      selectAll: (skus) => set({ selectedSkus: new Set(skus) }),

      // UI
      currentView: 'continuous',
      setCurrentView: (view) => set({ currentView: view }),

      currentSku: null,
      setCurrentSku: (sku) => set({ currentSku: sku }),

      // Filters
      statusFilter: 'all',
      setStatusFilter: (filter) => set({ statusFilter: filter as any }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Processing
      processingOptions: {
        jobType: 'main_image',
        professionalMode: false,
        consistencyMode: true,
      },
      setProcessingOptions: (options) =>
        set((state) => ({
          processingOptions: { ...state.processingOptions, ...options },
        })),

      // Review
      reviewMode: {
        currentIndex: 0,
        autoAdvance: true,
      },
      setReviewMode: (options) =>
        set((state) => ({
          reviewMode: { ...state.reviewMode, ...options },
        })),
    }),
    {
      name: 'ai-playground-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        processingOptions: state.processingOptions,
        reviewMode: state.reviewMode,
      }),
    }
  )
);
```

---

## File Storage Strategy

### Storage Abstraction

```python
# Backend: src/services/storage.py

from abc import ABC, abstractmethod
from typing import Optional
import os
from pathlib import Path

class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, file_path: str, key: str) -> str:
        """Upload file and return public URL"""
        pass

    @abstractmethod
    async def download(self, key: str, local_path: str) -> None:
        """Download file to local path"""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete file by key"""
        pass

    @abstractmethod
    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL or public URL"""
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str, public_url: str):
        self.base_path = Path(base_path)
        self.public_url = public_url

    async def upload(self, file_path: str, key: str) -> str:
        dest = self.base_path / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy(file_path, dest)
        return f"{self.public_url}/{key}"

    async def download(self, key: str, local_path: str) -> None:
        src = self.base_path / key
        import shutil
        shutil.copy(src, local_path)

    async def delete(self, key: str) -> None:
        file_path = self.base_path / key
        if file_path.exists():
            file_path.unlink()

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        return f"{self.public_url}/{key}"

class S3StorageProvider(StorageProvider):
    def __init__(self, bucket: str, region: str, access_key: str, secret_key: str):
        import boto3
        self.s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        self.bucket = bucket

    async def upload(self, file_path: str, key: str) -> str:
        self.s3_client.upload_file(file_path, self.bucket, key)
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"

    async def download(self, key: str, local_path: str) -> None:
        self.s3_client.download_file(self.bucket, key, local_path)

    async def delete(self, key: str) -> None:
        self.s3_client.delete_object(Bucket=self.bucket, Key=key)

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        import boto3
        from botocore.exceptions import ClientError
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return response
        except ClientError:
            return None

def get_storage_provider(config: dict) -> StorageProvider:
    provider_type = config.get('provider', 'local')

    if provider_type == 'local':
        return LocalStorageProvider(
            base_path=config.get('base_path', './storage/ai-playground'),
            public_url=config.get('public_url', '/storage/ai-playground')
        )
    elif provider_type == 's3':
        return S3StorageProvider(
            bucket=config['bucket'],
            region=config['region'],
            access_key=config['access_key'],
            secret_key=config['secret_key']
        )
    else:
        raise ValueError(f"Unknown storage provider: {provider_type}")
```

### Storage Key Patterns

```
ai-playground/
├── input/
│   └── {user_id}/
│       └── {sku}/
│           └── {original_filename}
├── output/
│   └── {user_id}/
│       └── {sku}/
│           └── {job_id}/
│               └── {image_type}_{timestamp}.{ext}
├── reference/
│   └── {user_id}/
│       └── {upload_id}.{ext}
└── downloads/
    └── {user_id}/
        └── {download_id}/
            └── {archive_name}.zip
```

---

## Security Considerations

### 1. API Key Encryption

```typescript
// src/lib/crypto.ts - Extend existing crypto utilities

export async function encryptApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(envConfigs.credential_encryption_key),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(envConfigs.credential_encryption_key),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );

  return decoder.decode(decrypted);
}
```

### 2. Rate Limiting

```python
# Backend: src/middleware/rate_limit.py

from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Apply to AI Playground endpoints
@router.post("/api/ai-playground/jobs")
@limiter.limit("10/minute")  # 10 jobs per minute per user
async def create_job(request: Request, ...):
    ...
```

### 3. Resource Quotas

```python
# Backend: src/services/quota.py

class ResourceQuota:
    MAX_CONCURRENT_JOBS = 3
    MAX_STORAGE_PER_USER = 10 * 1024 * 1024 * 1024  # 10GB
    MAX_JOB_QUEUE_SIZE = 100

    @staticmethod
    async def check_user_quota(user_id: str) -> dict:
        active_jobs = await db.get_active_job_count(user_id)
        storage_used = await db.get_storage_usage(user_id)

        return {
            'can_create_job': active_jobs < ResourceQuota.MAX_CONCURRENT_JOBS,
            'has_storage': storage_used < ResourceQuota.MAX_STORAGE_PER_USER,
            'active_jobs': active_jobs,
            'max_jobs': ResourceQuota.MAX_CONCURRENT_JOOTS,
            'storage_used': storage_used,
            'storage_limit': ResourceQuota.MAX_STORAGE_PER_USER,
        }
```

### 4. Input Validation

```python
# Backend: src/schemas/ai_playground.py

from pydantic import BaseModel, Field, validator
from typing import List, Optional

class CreateJobRequest(BaseModel):
    job_type: str = Field(..., regex="^(main_image|secondary_image|batch_optimize|custom)$")
    input: 'JobInput'
    options: Optional['JobOptions'] = None

    @validator('input')
    def validate_input(cls, v):
        if len(v.skus) > 100:
            raise ValueError('Cannot process more than 100 SKUs at once')
        for sku in v.skus:
            if not sku or len(sku) > 100:
                raise ValueError(f'Invalid SKU: {sku}')
        return v

class JobInput(BaseModel):
    skus: List[str] = Field(..., min_items=1, max_items=100)
    folder_name: Optional[str] = Field(None, max_length=255)
    image_type: Optional[str] = Field('all', regex='^(main|secondary|all)$')
```

---

## Testing Strategy

### Backend Tests

```python
# tests/test_ai_playground_api.py

import pytest
from fastapi.testclient import TestClient

def test_create_job(client: TestClient, auth_headers: dict):
    response = client.post(
        '/api/ai-playground/jobs',
        json={
            'jobType': 'main_image',
            'input': {'skus': ['TEST001', 'TEST002']},
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data['code'] == 0
    assert 'jobId' in data['data']

def test_get_job_status(client: TestClient, auth_headers: dict):
    # First create a job
    create_response = client.post('/api/ai-playground/jobs', ...)
    job_id = create_response.json()['data']['jobId']

    # Then get status
    response = client.get(f'/api/ai-playground/jobs/{job_id}', headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['data']['id'] == job_id

def test_workflow_approve(client: TestClient, auth_headers: dict):
    response = client.post(
        '/api/ai-playground/workflow/approve',
        json={
            'actions': [
                {'type': 'approve', 'targetId': 'sku-123', 'targetType': 'sku'}
            ]
        },
        headers=auth_headers
    )
    assert response.status_code == 200
```

### Frontend Tests

```typescript
// src/shared/blocks/ai-playground/__tests__/sku-list.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { SkuList } from '../components/sku-list';

describe('SkuList', () => {
  const mockSkus = [
    { sku: 'TEST001', folderName: 'test001', imageCount: 5, processedCount: 3 },
    { sku: 'TEST002', folderName: 'test002', imageCount: 3, processedCount: 0 },
  ];

  it('renders SKU list', () => {
    render(
      <SkuList
        skus={mockSkus}
        selectedSkus={new Set()}
        onSelect={jest.fn()}
        onBatchSelect={jest.fn()}
        filter=""
        onFilterChange={jest.fn()}
        statusFilter="all"
        onStatusFilterChange={jest.fn()}
      />
    );

    expect(screen.getByText('TEST001')).toBeInTheDocument();
    expect(screen.getByText('TEST002')).toBeInTheDocument();
  });

  it('filters SKUs by search', async () => {
    render(
      <SkuList
        skus={mockSkus}
        selectedSkus={new Set()}
        onSelect={jest.fn()}
        onBatchSelect={jest.fn()}
        filter=""
        onFilterChange={jest.fn()}
        statusFilter="all"
        onStatusFilterChange={jest.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search SKUs...');
    fireEvent.change(searchInput, { target: { value: 'TEST001' } });

    expect(screen.getByText('TEST001')).toBeInTheDocument();
    expect(screen.queryByText('TEST002')).not.toBeInTheDocument();
  });
});
```

---

## Deployment Checklist

### Backend Deployment

- [ ] Update Python dependencies in `requirements.txt`
- [ ] Add AI Playground routes to FastAPI app
- [ ] Configure environment variables:
  - `AI_PLAYGROUND_STORAGE_PROVIDER`
  - `AI_PLAYGROUND_STORAGE_PATH` or `AI_PLAYGROUND_S3_*`
  - `AI_DEFAULT_MODEL`
  - `CREDENTIAL_ENCRYPTION_KEY` (already exists)
- [ ] Run database migrations for new tables
- [ ] Set up worker process for job queue (Celery/asyncio)
- [ ] Configure rate limiting and quotas
- [ ] Set up monitoring and logging

### Frontend Deployment

- [ ] Add AI Playground routes to dashboard
- [ ] Create translation files:
  - `src/config/locale/messages/en/dashboard/aiplayground.json`
  - `src/config/locale/messages/zh/dashboard/aiplayground.json`
- [ ] Add sidebar navigation item
- [ ] Update `src/config/locale/index.ts` with new message paths
- [ ] Test all pages and components
- [ ] Verify responsive design

### Database Migration

```sql
-- Run this migration in production
BEGIN;

-- Create all tables (see schema above)
CREATE TABLE ai_job (...);
CREATE TABLE ai_job_log (...);
CREATE TABLE ai_workflow_state (...);
CREATE TABLE ai_image_pair (...);
CREATE TABLE ai_prompt_template (...);
CREATE TABLE ai_user_setting (...);
CREATE TABLE ai_download_queue (...);

-- Create indexes
CREATE INDEX idx_ai_job_user ON ai_job(user_id);
CREATE INDEX idx_ai_job_status ON ai_job(status);
-- ... (see schema above)

COMMIT;
```

### Environment Variables

```bash
# .env.production

# AI Playground API
AI_PLAYGROUND_API_URL=http://localhost:8000
AI_DEFAULT_MODEL=gpt-4-vision-preview
AI_MAX_CONCURRENT_JOBS=3

# Storage
AI_STORAGE_PROVIDER=local  # or 's3'
AI_STORAGE_PATH=./storage/ai-playground
# For S3:
# AI_STORAGE_PROVIDER=s3
# AI_S3_BUCKET=ai-playground
# AI_S3_REGION=us-east-1
# AI_S3_ACCESS_KEY=xxx
# AI_S3_SECRET_KEY=xxx

# External AI API (optional - user can override)
AI_DEFAULT_API_ENDPOINT=https://api.openai.com/v1
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Database schema and migrations
2. Basic API structure
3. Core components scaffolding
4. Authentication integration

### Phase 2: Core Processing (Week 2)
1. Job creation and queue management
2. Image upload and storage
3. Basic processing pipeline
4. Progress tracking

### Phase 3: UI Implementation (Week 3)
1. Main processing page
2. SKU list component
3. Image pair display
4. Progress modal

### Phase 4: Workflow & Review (Week 4)
1. Review workflow page
2. Approve/reject functionality
3. Batch operations
4. Archive management

### Phase 5: Advanced Features (Week 5)
1. History page
2. Settings page
3. Prompt templates
4. Download manager

### Phase 6: Polish & Testing (Week 6)
1. Error handling
2. Loading states
3. Responsive design
4. End-to-end testing

---

## References

- Demo backend: `dev/ozon-backen/demo2/`
- Demo frontend: `dev/ozon-backen/demo2/web/`
- Existing Ozon integration: `src/app/api/ozon/`
- Dashboard layout: `src/app/[locale]/(user)/dashboard/`
- Database schema: `src/config/db/schema.postgres.ts`
