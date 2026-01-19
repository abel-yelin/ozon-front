# AI Playground Module - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the AI-powered image processing system from the demo into the existing dashboard framework with full React UI, shared Python backend, and PostgreSQL persistence.

**Architecture:** Multi-layer architecture with Next.js 16 frontend, FastAPI backend extension, PostgreSQL database, and file storage. Frontend uses React Query for server state and Zustand for client state. Backend extends existing Ozon FastAPI service with new AI Playground endpoints.

**Tech Stack:** Next.js 16, React, shadcn/ui, TypeScript, Drizzle ORM, FastAPI, PostgreSQL, Zustand, React Query

---

## Task 1: Database Schema - Add AI Playground Tables

**Files:**
- Modify: `src/config/db/schema.postgres.ts`
- Test: Manual verification via `npm run db:push`

**Step 1: Add imports to schema file**

```typescript
// Add at the top with other imports
import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { user } from './user';
```

**Step 2: Add aiJob table**

```typescript
export const aiJob = pgTable('ai_job', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull(),
  status: text('status').notNull().default('pending'),
  priority: integer('priority').default(0),
  inputData: jsonb('input_data').notNull(),
  promptTemplateId: text('prompt_template_id'),
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
```

**Step 3: Add aiJobLog table**

```typescript
export const aiJobLog = pgTable('ai_job_log', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => aiJob.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('idx_ai_job_log_job').on(table.jobId),
  index('idx_ai_job_log_timestamp').on(table.timestamp),
]);
```

**Step 4: Add aiWorkflowState table**

```typescript
export const aiWorkflowState = pgTable('ai_workflow_state', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  folderName: text('folder_name').notNull(),
  status: text('status').notNull().default('pending'),
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
```

**Step 5: Add aiImagePair table**

```typescript
export const aiImagePair = pgTable('ai_image_pair', {
  id: text('id').primaryKey(),
  workflowStateId: text('workflow_state_id').references(() => aiWorkflowState.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => aiJob.id, { onDelete: 'set null' }),
  inputImageUrl: text('input_image_url').notNull(),
  outputImageUrl: text('output_image_url'),
  inputStorageKey: text('input_storage_key').notNull(),
  outputStorageKey: text('output_storage_key'),
  status: text('status').notNull().default('pending'),
  skipReason: text('skip_reason'),
  isMainImage: boolean('is_main_image').default(false),
  imageType: text('image_type'),
  generationParams: jsonb('generation_params'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_ai_image_pair_workflow').on(table.workflowStateId),
  index('idx_ai_image_pair_job').on(table.jobId),
  index('idx_ai_image_pair_status').on(table.status),
]);
```

**Step 6: Add aiPromptTemplate table**

```typescript
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
  index('idx_ai_prompt_template_group').on(table.groupName),
]);
```

**Step 7: Add aiUserSetting table**

```typescript
export const aiUserSetting = pgTable('ai_user_setting', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  apiEndpoint: text('api_endpoint').notNull(),
  apiKey: text('api_key').notNull(),
  defaultModel: text('default_model').notNull(),
  maxConcurrentJobs: integer('max_concurrent_jobs').default(3),
  defaultPromptTemplateId: text('default_prompt_template_id').references(() => aiPromptTemplate.id),
  enableProfessionalMode: boolean('enable_professional_mode').default(false),
  consistencyMode: boolean('consistency_mode').default(true),
  defaultView: text('default_view').default('continuous'),
  itemsPerPage: integer('items_per_page').default(50),
  autoAdvance: boolean('auto_advance').default(true),
  storageProvider: text('storage_provider').default('local'),
  storageConfig: jsonb('storage_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Step 8: Add aiDownloadQueue table**

```typescript
export const aiDownloadQueue = pgTable('ai_download_queue', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => aiJob.id, { onDelete: 'cascade' }),
  shopName: text('shop_name').notNull(),
  skuList: jsonb('sku_list').notNull().$type<string[]>(),
  imageType: text('image_type').notNull(),
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
```

**Step 9: Add relations**

```typescript
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

**Step 10: Run database push**

Run: `npm run db:push`
Expected: Tables created successfully

**Step 11: Commit**

```bash
git add src/config/db/schema.postgres.ts
git commit -m "feat: add AI Playground database schema"
```

---

## Task 2: Create Database Operations Layer

**Files:**
- Create: `src/lib/db/ai-playground.ts`
- Test: Manual verification via import

**Step 1: Write the AiDb class skeleton**

```typescript
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/config/db';
import {
  aiJob,
  aiJobLog,
  aiWorkflowState,
  aiImagePair,
  aiPromptTemplate,
  aiUserSetting,
  aiDownloadQueue,
  type AiJob,
  type AiWorkflowState,
  type AiImagePair,
  type AiPromptTemplate,
  type AiUserSetting,
} from '@/config/db/schema';

export class AiDb {
  // Job methods will be added here
}
```

**Step 2: Add createJob method**

```typescript
async createJob(input: {
  userId: string;
  jobType: string;
  inputData: any;
  promptTemplateId?: string;
  priority?: number;
}) {
  const job = {
    id: nanoid(),
    userId: input.userId,
    jobType: input.jobType,
    status: 'pending',
    priority: input.priority || 0,
    inputData: input.inputData,
    promptTemplateId: input.promptTemplateId,
    totalItems: Array.isArray(input.inputData.skus) ? input.inputData.skus.length : 0,
    createdAt: new Date(),
  };

  await db.insert(aiJob).values(job);
  return job;
}
```

**Step 3: Add getJob method**

```typescript
async getJob(jobId: string) {
  const jobs = await db
    .select()
    .from(aiJob)
    .where(eq(aiJob.id, jobId))
    .limit(1);

  return jobs[0] || null;
}
```

**Step 4: Add getUserJobs method**

```typescript
async getUserJobs(userId: string, options: {
  limit?: number;
  offset?: number;
  status?: string;
} = {}) {
  const conditions = [eq(aiJob.userId, userId)];

  if (options.status) {
    conditions.push(eq(aiJob.status, options.status));
  }

  const jobs = await db
    .select()
    .from(aiJob)
    .where(and(...conditions))
    .orderBy(desc(aiJob.createdAt))
    .limit(options.limit || 20)
    .offset(options.offset || 0);

  return jobs;
}
```

**Step 5: Add updateJobStatus method**

```typescript
async updateJobStatus(jobId: string, status: string, updates: Partial<AiJob> = {}) {
  await db
    .update(aiJob)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(aiJob.id, jobId));
}
```

**Step 6: Add updateJobProgress method**

```typescript
async updateJobProgress(jobId: string, progress: {
  processedItems: number;
  failedItems?: number;
}) {
  const job = await this.getJob(jobId);
  if (!job) throw new Error('Job not found');

  const percentage = job.totalItems > 0
    ? Math.round((progress.processedItems / job.totalItems) * 100)
    : 0;

  await db
    .update(aiJob)
    .set({
      processedItems: progress.processedItems,
      failedItems: progress.failedItems || 0,
      progressPercentage: percentage,
      updatedAt: new Date(),
    })
    .where(eq(aiJob.id, jobId));
}
```

**Step 7: Add addJobLog method**

```typescript
async addJobLog(log: {
  jobId: string;
  level: string;
  message: string;
}) {
  await db.insert(aiJobLog).values({
    id: nanoid(),
    jobId: log.jobId,
    level: log.level,
    message: log.message,
    timestamp: new Date(),
  });
}
```

**Step 8: Add getJobLogs method**

```typescript
async getJobLogs(jobId: string, options: {
  limit?: number;
  level?: string;
} = {}) {
  const conditions = [eq(aiJobLog.jobId, jobId)];

  if (options.level) {
    conditions.push(eq(aiJobLog.level, options.level));
  }

  const logs = await db
    .select()
    .from(aiJobLog)
    .where(and(...conditions))
    .orderBy(desc(aiJobLog.timestamp))
    .limit(options.limit || 100);

  return logs;
}
```

**Step 9: Add deleteJob method**

```typescript
async deleteJob(jobId: string) {
  await db.delete(aiJob).where(eq(aiJob.id, jobId));
}
```

**Step 10: Add getOrCreateUserSetting method**

```typescript
async getOrCreateUserSetting(userId: string) {
  let settings = await db
    .select()
    .from(aiUserSetting)
    .where(eq(aiUserSetting.userId, userId))
    .limit(1);

  if (settings[0]) {
    return settings[0];
  }

  const newSettings = {
    id: nanoid(),
    userId,
    apiEndpoint: '',
    apiKey: '',
    defaultModel: '',
    maxConcurrentJobs: 3,
    enableProfessionalMode: false,
    consistencyMode: true,
    defaultView: 'continuous',
    itemsPerPage: 50,
    autoAdvance: true,
    storageProvider: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(aiUserSetting).values(newSettings);
  return newSettings;
}
```

**Step 11: Add updateUserSetting method**

```typescript
async updateUserSetting(userId: string, updates: Partial<AiUserSetting>) {
  await db
    .update(aiUserSetting)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(aiUserSetting.userId, userId));
}
```

**Step 12: Add getPromptTemplates method**

```typescript
async getPromptTemplates(options: {
  userId?: string;
  groupName?: string;
  includeSystem?: boolean;
} = {}) {
  const conditions: any[] = [];

  if (options.groupName) {
    conditions.push(eq(aiPromptTemplate.groupName, options.groupName));
  }

  if (!options.includeSystem) {
    conditions.push(sql`${aiPromptTemplate.userId} IS NOT NULL`);
  }

  const templates = await db
    .select()
    .from(aiPromptTemplate)
    .where(and(...conditions))
    .orderBy(aiPromptTemplate.sortOrder, aiPromptTemplate.templateName);

  return templates;
}
```

**Step 13: Create export instance**

```typescript
export const aiDb = new AiDb();
```

**Step 14: Commit**

```bash
git add src/lib/db/ai-playground.ts
git commit -m "feat: add AI Playground database operations layer"
```

---

## Task 3: Create API Client Library

**Files:**
- Create: `src/shared/blocks/ai-playground/lib/types.ts`
- Create: `src/shared/blocks/ai-playground/lib/constants.ts`
- Create: `src/shared/blocks/ai-playground/lib/api-client.ts`

**Step 1: Write type definitions**

```typescript
// src/shared/blocks/ai-playground/lib/types.ts

export type JobType = 'main_image' | 'secondary_image' | 'batch_optimize' | 'custom';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStatus = 'pending' | 'approved' | 'archived';
export type ImagePairStatus = 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';
export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface CreateJobInput {
  jobType: JobType;
  input: {
    skus: string[];
    folderName?: string;
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

export interface Job {
  id: string;
  userId: string;
  jobType: JobType;
  status: JobStatus;
  priority: number;
  inputData: any;
  promptTemplateId?: string;
  resultData?: any;
  errorMessage?: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progressPercentage: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
}

export interface JobLog {
  id: string;
  jobId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface WorkflowState {
  id: string;
  userId: string;
  sku: string;
  folderName: string;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  imagePairs: ImagePair[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  archivedAt?: string;
}

export interface ImagePair {
  id: string;
  workflowStateId?: string;
  jobId?: string;
  inputImageUrl: string;
  outputImageUrl?: string;
  inputStorageKey: string;
  outputStorageKey?: string;
  status: ImagePairStatus;
  skipReason?: string;
  isMainImage: boolean;
  imageType?: string;
  generationParams?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  userId?: string;
  groupName: string;
  templateName: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  systemPrompt?: string;
  model: string;
  apiEndpoint?: string;
  parameters?: any;
  isActive: boolean;
  isProfessional: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  apiEndpoint: string;
  defaultModel: string;
  maxConcurrentJobs: number;
  defaultPromptTemplateId?: string;
  enableProfessionalMode: boolean;
  consistencyMode: boolean;
  defaultView: 'continuous' | 'step_review';
  itemsPerPage: number;
  autoAdvance: boolean;
  storageProvider: 'local' | 's3' | 'oss';
  storageConfig?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message?: string;
}
```

**Step 2: Write constants**

```typescript
// src/shared/blocks/ai-playground/lib/constants.ts

export const AI_PLAYGROUND_API_BASE = '/api/ai-playground';

export const JOB_TYPE_LABELS: Record<string, string> = {
  main_image: 'Main Image',
  secondary_image: 'Secondary Images',
  batch_optimize: 'Batch Optimize',
  custom: 'Custom',
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  archived: 'Archived',
};

export const IMAGE_PAIR_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
};

export const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
export const MAX_RETRY_ATTEMPTS = 3;
```

**Step 3: Write API client class**

```typescript
// src/shared/blocks/ai-playground/lib/api-client.ts

import type {
  ApiResponse,
  CreateJobInput,
  Job,
  JobLog,
  WorkflowState,
  PromptTemplate,
  UserSettings,
} from './types';
import { AI_PLAYGROUND_API_BASE } from './constants';

class AiPlaygroundApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_PLAYGROUND_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Jobs API
  async createJob(input: CreateJobInput): Promise<ApiResponse<{ jobId: string; status: string; totalItems: number }>> {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getJobs(params: {
    page?: number;
    limit?: number;
    status?: string;
    jobType?: string;
  } = {}): Promise<ApiResponse<{ items: Job[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.jobType) searchParams.set('jobType', params.jobType);

    const query = searchParams.toString();
    return this.request(`/jobs${query ? `?${query}` : ''}`);
  }

  async getJob(jobId: string): Promise<ApiResponse<Job>> {
    return this.request(`/jobs/${jobId}`);
  }

  async cancelJob(jobId: string): Promise<ApiResponse<{ jobId: string; status: string }>> {
    return this.request(`/jobs/${jobId}/cancel`, { method: 'POST' });
  }

  async getJobLogs(jobId: string, params: {
    level?: string;
    limit?: number;
    since?: string;
  } = {}): Promise<ApiResponse<{ logs: JobLog[]; hasMore: boolean }>> {
    const searchParams = new URLSearchParams();
    if (params.level) searchParams.set('level', params.level);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.since) searchParams.set('since', params.since);

    const query = searchParams.toString();
    return this.request(`/jobs/${jobId}/logs${query ? `?${query}` : ''}`);
  }

  // Workflow API
  async getWorkflow(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: WorkflowState[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/workflow${query ? `?${query}` : ''}`);
  }

  async approveWorkflow(actions: Array<{
    type: 'approve' | 'reject';
    targetId: string;
    targetType: 'sku' | 'image_pair';
    reason?: string;
  }>): Promise<ApiResponse<{ processed: number; results: any[] }>> {
    return this.request('/workflow/approve', {
      method: 'POST',
      body: JSON.stringify({ actions }),
    });
  }

  async archiveWorkflow(workflowStateIds: string[]): Promise<ApiResponse<{ archived: number; ids: string[] }>> {
    return this.request('/workflow/archive', {
      method: 'POST',
      body: JSON.stringify({ workflowStateIds }),
    });
  }

  async getWorkflowBySku(sku: string): Promise<ApiResponse<WorkflowState>> {
    return this.request(`/workflow/${sku}`);
  }

  // Folders API
  async getFolders(params: {
    search?: string;
    status?: string;
    hasImages?: boolean;
  } = {}): Promise<ApiResponse<{ folders: any[] }>> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.hasImages !== undefined) searchParams.set('hasImages', params.hasImages.toString());

    const query = searchParams.toString();
    return this.request(`/folders${query ? `?${query}` : ''}`);
  }

  async getFolderPairs(sku: string, params: { includeSkipped?: boolean } = {}): Promise<ApiResponse<{ sku: string; pairs: any[] }>> {
    const searchParams = new URLSearchParams();
    if (params.includeSkipped) searchParams.set('includeSkipped', 'true');

    const query = searchParams.toString();
    return this.request(`/folders/${sku}/pairs${query ? `?${query}` : ''}`);
  }

  // Settings API
  async getSettings(): Promise<ApiResponse<UserSettings>> {
    return this.request('/settings');
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Prompts API
  async getPrompts(params: {
    group?: string;
    isProfessional?: boolean;
  } = {}): Promise<ApiResponse<{ groups: any[] }>> {
    const searchParams = new URLSearchParams();
    if (params.group) searchParams.set('group', params.group);
    if (params.isProfessional !== undefined) searchParams.set('isProfessional', params.isProfessional.toString());

    const query = searchParams.toString();
    return this.request(`/prompts${query ? `?${query}` : ''}`);
  }

  async getPrompt(templateId: string): Promise<ApiResponse<PromptTemplate>> {
    return this.request(`/prompts/${templateId}`);
  }

  async createPrompt(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<PromptTemplate>> {
    return this.request('/prompts', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updatePrompt(templateId: string, updates: Partial<PromptTemplate>): Promise<ApiResponse<PromptTemplate>> {
    return this.request(`/prompts/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePrompt(templateId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/prompts/${templateId}`, { method: 'DELETE' });
  }

  // Download API
  async createDownload(params: {
    shopName: string;
    skus: string[];
    imageType: 'main' | 'secondary' | 'all';
    format?: 'zip' | 'tar';
    compression?: 'store' | 'fast' | 'normal' | 'max';
  }): Promise<ApiResponse<{ downloadId: string; status: string; estimatedFiles: number; estimatedSize: number }>> {
    return this.request('/download', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getDownloadStatus(downloadId: string): Promise<ApiResponse<any>> {
    return this.request(`/download/${downloadId}`);
  }

  // System API
  async getStatus(): Promise<ApiResponse<{
    systemStatus: string;
    activeJobs: number;
    queuedJobs: number;
    completedToday: number;
    failedToday: number;
    avgProcessingTime: number;
    storageUsed: number;
    storageLimit: number;
  }>> {
    return this.request('/status');
  }
}

export const aiApi = new AiPlaygroundApiClient();
```

**Step 4: Commit**

```bash
git add src/shared/blocks/ai-playground/lib/
git commit -m "feat: add AI Playground API client library"
```

---

## Task 4: Create Translation Files

**Files:**
- Create: `src/config/locale/messages/en/dashboard/aiplayground.json`
- Create: `src/config/locale/messages/zh/dashboard/aiplayground.json`
- Modify: `src/config/locale/index.ts`

**Step 1: Create English translation file**

```json
{
  "metadata": {
    "title": "AI Playground - Image Processing",
    "description": "AI-powered image processing and optimization for e-commerce"
  },
  "page": {
    "title": "AI Playground"
  },
  "crumb": "AI Playground",
  "sidebar": {
    "title": "AI Playground",
    "items": [
      {
        "title": "Overview",
        "url": "/dashboard/aiplayground",
        "icon": "LayoutDashboard"
      },
      {
        "title": "Review",
        "url": "/dashboard/aiplayground/review",
        "icon": "CheckCircle"
      },
      {
        "title": "History",
        "url": "/dashboard/aiplayground/history",
        "icon": "History"
      },
      {
        "title": "Settings",
        "url": "/dashboard/aiplayground/settings",
        "icon": "Settings"
      }
    ]
  },
  "overview": {
    "crumb_dashboard": "Dashboard",
    "title": "AI Image Processing",
    "description": "Process and optimize your product images with AI"
  },
  "processing": {
    "title": "Processing Options",
    "modes": {
      "main_image": "Main Image",
      "secondary_image": "Secondary Images",
      "batch_optimize": "Batch Optimize",
      "custom": "Custom"
    },
    "prompt_template": "Prompt Template",
    "custom_prompt": "Custom Prompt",
    "custom_prompt_placeholder": "Add custom instructions...",
    "professional_mode": "Professional Mode",
    "professional_mode_desc": "Use advanced prompts for higher quality",
    "consistency_mode": "Consistency Mode",
    "consistency_mode_desc": "Maintain visual consistency across images",
    "start_processing": "Start Processing",
    "processing": "Processing...",
    "select_skus": "Select SKUs to process",
    "no_skus_selected": "No SKUs selected"
  },
  "sku_list": {
    "search_placeholder": "Search SKUs...",
    "filter_status": "Filter by status",
    "status_all": "All Statuses",
    "status_pending": "Pending",
    "status_approved": "Approved",
    "status_archived": "Archived",
    "select_all": "Select All",
    "clear": "Clear",
    "images_count": "{count} images",
    "processed_count": "{processed}/{total} images"
  },
  "image_pair": {
    "original": "Original",
    "generated": "Generated",
    "main_image": "Main Image",
    "waiting": "Waiting...",
    "skipped": "Skipped",
    "approve": "Approve",
    "reject": "Reject",
    "regenerate": "Regenerate",
    "skip": "Skip"
  },
  "progress": {
    "title": "Processing Progress",
    "current": "Processing {current} of {total}",
    "logs": "Logs",
    "close": "Close",
    "cancel": "Cancel Job"
  },
  "review": {
    "crumb_dashboard": "Dashboard",
    "title": "Review Workflow",
    "description": "Review and approve generated images",
    "approve_selected": "Approve Selected",
    "reject_selected": "Reject Selected",
    "archive_approved": "Archive Approved",
    "auto_advance": "Auto Advance",
    "previous": "Previous",
    "next": "Next"
  },
  "history": {
    "crumb_dashboard": "Dashboard",
    "title": "Job History",
    "description": "View past processing jobs",
    "filters": {
      "status": "Status",
      "job_type": "Job Type",
      "date_from": "From",
      "date_to": "To"
    },
    "job": {
      "id": "Job ID",
      "type": "Type",
      "status": "Status",
      "progress": "Progress",
      "created": "Created",
      "completed": "Completed",
      "view_details": "View Details",
      "view_logs": "View Logs",
      "cancel": "Cancel"
    },
    "logs": {
      "title": "Job Logs",
      "level": "Level",
      "message": "Message",
      "timestamp": "Time",
      "close": "Close"
    }
  },
  "settings": {
    "crumb_dashboard": "Dashboard",
    "title": "AI Playground Settings",
    "description": "Configure your AI processing preferences"
  },
  "errors": {
    "no_settings": "Please configure your API settings first",
    "quota_exceeded": "You have exceeded your job quota",
    "api_error": "API error occurred",
    "upload_failed": "Failed to upload file",
    "job_failed": "Job failed to complete"
  }
}
```

**Step 2: Create Chinese translation file**

```json
{
  "metadata": {
    "title": "AI 实验室 - 图片处理",
    "description": "为电商提供 AI 驱动的图片处理和优化"
  },
  "page": {
    "title": "AI 实验室"
  },
  "crumb": "AI 实验室",
  "sidebar": {
    "title": "AI 实验室",
    "items": [
      {
        "title": "概览",
        "url": "/dashboard/aiplayground",
        "icon": "LayoutDashboard"
      },
      {
        "title": "审核",
        "url": "/dashboard/aiplayground/review",
        "icon": "CheckCircle"
      },
      {
        "title": "历史",
        "url": "/dashboard/aiplayground/history",
        "icon": "History"
      },
      {
        "title": "设置",
        "url": "/dashboard/aiplayground/settings",
        "icon": "Settings"
      }
    ]
  },
  "overview": {
    "crumb_dashboard": "仪表盘",
    "title": "AI 图片处理",
    "description": "使用 AI 处理和优化您的商品图片"
  },
  "processing": {
    "title": "处理选项",
    "modes": {
      "main_image": "主图",
      "secondary_image": "副图",
      "batch_optimize": "批量优化",
      "custom": "自定义"
    },
    "prompt_template": "提示词模板",
    "custom_prompt": "自定义提示词",
    "custom_prompt_placeholder": "添加自定义说明...",
    "professional_mode": "专业模式",
    "professional_mode_desc": "使用高级提示词获得更高质量",
    "consistency_mode": "一致性模式",
    "consistency_mode_desc": "在图片间保持视觉一致性",
    "start_processing": "开始处理",
    "processing": "处理中...",
    "select_skus": "选择要处理的 SKU",
    "no_skus_selected": "未选择任何 SKU"
  },
  "sku_list": {
    "search_placeholder": "搜索 SKU...",
    "filter_status": "按状态筛选",
    "status_all": "全部状态",
    "status_pending": "待处理",
    "status_approved": "已审核",
    "status_archived": "已归档",
    "select_all": "全选",
    "clear": "清除",
    "images_count": "{count} 张图片",
    "processed_count": "{processed}/{total} 张图片"
  },
  "image_pair": {
    "original": "原图",
    "generated": "生成图",
    "main_image": "主图",
    "waiting": "等待中...",
    "skipped": "已跳过",
    "approve": "通过",
    "reject": "拒绝",
    "regenerate": "重新生成",
    "skip": "跳过"
  },
  "progress": {
    "title": "处理进度",
    "current": "正在处理 {current}/{total}",
    "logs": "日志",
    "close": "关闭",
    "cancel": "取消任务"
  },
  "review": {
    "crumb_dashboard": "仪表盘",
    "title": "审核工作流",
    "description": "审核并确认生成的图片",
    "approve_selected": "通过选中",
    "reject_selected": "拒绝选中",
    "archive_approved": "归档已审核",
    "auto_advance": "自动前进",
    "previous": "上一个",
    "next": "下一个"
  },
  "history": {
    "crumb_dashboard": "仪表盘",
    "title": "任务历史",
    "description": "查看历史处理任务",
    "filters": {
      "status": "状态",
      "job_type": "任务类型",
      "date_from": "开始日期",
      "date_to": "结束日期"
    },
    "job": {
      "id": "任务 ID",
      "type": "类型",
      "status": "状态",
      "progress": "进度",
      "created": "创建时间",
      "completed": "完成时间",
      "view_details": "查看详情",
      "view_logs": "查看日志",
      "cancel": "取消"
    },
    "logs": {
      "title": "任务日志",
      "level": "级别",
      "message": "消息",
      "timestamp": "时间",
      "close": "关闭"
    }
  },
  "settings": {
    "crumb_dashboard": "仪表盘",
    "title": "AI 实验室设置",
    "description": "配置您的 AI 处理偏好"
  },
  "errors": {
    "no_settings": "请先配置您的 API 设置",
    "quota_exceeded": "您已超出配额",
    "api_error": "API 错误",
    "upload_failed": "文件上传失败",
    "job_failed": "任务处理失败"
  }
}
```

**Step 3: Update locale messages paths**

```typescript
// Add to localeMessagesPaths array in src/config/locale/index.ts

  'dashboard/aiplayground/overview',
  'dashboard/aiplayground/processing',
  'dashboard/aiplayground/review',
  'dashboard/aiplayground/history',
  'dashboard/aiplayground/settings',
  'dashboard/aiplayground/sku-list',
  'dashboard/aiplayground/image-pair',
  'dashboard/aiplayground/progress',
```

**Step 4: Update sidebar translations**

Modify both English and Chinese sidebar files to add AI Playground navigation.

```json
// Add to main_navs items in dashboard/sidebar.json
{
  "title": "AI Playground",
  "items": [
    {
      "title": "Overview",
      "url": "/dashboard/aiplayground",
      "icon": "Wand2"
    },
    {
      "title": "Review",
      "url": "/dashboard/aiplayground/review",
      "icon": "CheckCircle"
    },
    {
      "title": "History",
      "url": "/dashboard/aiplayground/history",
      "icon": "History"
    },
    {
      "title": "Settings",
      "url": "/dashboard/aiplayground/settings",
      "icon": "Settings"
    }
  ]
}
```

**Step 5: Commit**

```bash
git add src/config/locale/
git commit -m "feat: add AI Playground translations"
```

---

## Task 5: Create Main Processing Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/aiplayground/page.tsx`
- Create: `src/shared/blocks/ai-playground/components/processing-options.tsx`
- Create: `src/shared/blocks/ai-playground/components/sku-list.tsx`
- Create: `src/shared/blocks/ai-playground/components/image-pair-grid.tsx`
- Create: `src/shared/blocks/ai-playground/components/progress-modal.tsx`

**Step 1: Write the main page component**

```typescript
// src/app/[locale]/(user)/dashboard/aiplayground/page.tsx

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { ProcessingContent } from '@/shared/blocks/ai-playground/processing-content';

export default async function AiPlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.aiplayground.overview');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <ProcessingContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 2: Write the processing content component**

```typescript
// src/shared/blocks/ai-playground/processing-content.tsx

'use client';

import { useState } from 'react';

import { ProcessingOptions } from './components/processing-options';
import { SkuList } from './components/sku-list';
import { ImagePairGrid } from './components/image-pair-grid';
import { ProgressModal } from './components/progress-modal';
import { useAiPlaygroundStore } from './lib/store';

export function ProcessingContent() {
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [skus, setSkus] = useState<any[]>([]);
  const [imagePairs, setImagePairs] = useState<any[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<any[]>([]);

  const {
    selectedSkus,
    processingOptions,
    setProcessingOptions,
  } = useAiPlaygroundStore();

  const handleStartProcessing = async () => {
    // Implementation will be added
    console.log('Starting processing with options:', processingOptions);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar - SKU List */}
      <div className="lg:col-span-1">
        <SkuList
          skus={skus}
          selectedSkus={selectedSkus}
          onSelect={(sku) => console.log('Selected SKU:', sku)}
          onBatchSelect={(skus) => console.log('Batch select:', skus)}
          filter=""
          onFilterChange={(filter) => console.log('Filter:', filter)}
          statusFilter="all"
          onStatusFilterChange={(filter) => console.log('Status filter:', filter)}
        />
      </div>

      {/* Right Content Area */}
      <div className="lg:col-span-3 space-y-6">
        {/* Processing Options */}
        <ProcessingOptions
          promptTemplates={promptTemplates}
          selectedTemplate={processingOptions.templateId}
          onTemplateChange={(id) => setProcessingOptions({ templateId: id })}
          customPrompt={processingOptions.customPrompt}
          onCustomPromptChange={(prompt) => setProcessingOptions({ customPrompt: prompt })}
          jobType={processingOptions.jobType}
          onJobTypeChange={(type) => setProcessingOptions({ jobType: type })}
          enableProfessionalMode={processingOptions.professionalMode}
          onProfessionalModeChange={(enabled) => setProcessingOptions({ professionalMode: enabled })}
          consistencyMode={processingOptions.consistencyMode}
          onConsistencyModeChange={(enabled) => setProcessingOptions({ consistencyMode: enabled })}
          onStart={handleStartProcessing}
          disabled={selectedSkus.size === 0}
        />

        {/* Image Pairs Display */}
        <ImagePairGrid pairs={imagePairs} />

        {/* Progress Modal */}
        {activeJob && (
          <ProgressModal
            jobId={activeJob}
            onClose={() => setActiveJob(null)}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 3: Write the processing options component**

```typescript
// src/shared/blocks/ai-playground/components/processing-options.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Loader2, Play } from 'lucide-react';

interface ProcessingOptionsProps {
  promptTemplates: any[];
  selectedTemplate?: string;
  onTemplateChange: (id: string) => void;
  customPrompt?: string;
  onCustomPromptChange: (prompt: string) => void;
  jobType: string;
  onJobTypeChange: (type: string) => void;
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
  const jobTypes = [
    { value: 'main_image', label: 'Main Image', icon: 'Image' },
    { value: 'secondary_image', label: 'Secondary Images', icon: 'Copy' },
    { value: 'batch_optimize', label: 'Batch Optimize', icon: 'Zap' },
    { value: 'custom', label: 'Custom', icon: 'Settings' },
  ];

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
            {jobTypes.map(type => (
              <Button
                key={type.value}
                variant={jobType === type.value ? 'default' : 'outline'}
                onClick={() => onJobTypeChange(type.value)}
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

**Step 4: Write the SKU list component**

```typescript
// src/shared/blocks/ai-playground/components/sku-list.tsx

'use client';

import { useState, useMemo } from 'react';

import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

interface Sku {
  sku: string;
  folderName: string;
  imageCount: number;
  processedCount: number;
  status?: 'pending' | 'approved' | 'archived';
}

interface SkuListProps {
  skus: Sku[];
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
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Search and Filters */}
      <div className="p-4 border-b space-y-3 bg-muted/30">
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
      <div className="p-4 border-b flex gap-2 bg-muted/30">
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
  sku: Sku;
  selected: boolean;
  onClick: () => void;
}) {
  const progress = sku.imageCount > 0
    ? Math.round((sku.processedCount / sku.imageCount) * 100)
    : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors',
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

**Step 5: Write the image pair grid component**

```typescript
// src/shared/blocks/ai-playground/components/image-pair-grid.tsx

'use client';

import { ImagePair } from './image-pair';

interface ImagePairGridProps {
  pairs: Array<{
    id: string;
    inputUrl: string;
    outputUrl?: string;
    status: string;
    skipReason?: string;
    isMainImage?: boolean;
  }>;
}

export function ImagePairGrid({ pairs }: ImagePairGridProps) {
  if (pairs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No images to display</p>
        <p className="text-sm">Select SKUs and start processing to see results</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pairs.map(pair => (
        <ImagePair
          key={pair.id}
          inputUrl={pair.inputUrl}
          outputUrl={pair.outputUrl}
          status={pair.status as any}
          skipReason={pair.skipReason}
          isMainImage={pair.isMainImage}
        />
      ))}
    </div>
  );
}
```

**Step 6: Write the image pair component**

```typescript
// src/shared/blocks/ai-playground/components/image-pair.tsx

'use client';

import { useState } from 'react';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Loader2, AlertCircle, Check, X, RefreshCw, SkipForward } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

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
  const [zoomed, setZoomed] = useState<'input' | 'output' | null>(null);

  return (
    <Card className="overflow-hidden group">
      {isMainImage && (
        <Badge className="absolute top-2 left-2 z-10">
          Main Image
        </Badge>
      )}

      <CardContent className="p-4">
        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Input Image */}
          <div
            className="relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-muted"
            onClick={() => setZoomed('input')}
          >
            <img
              src={inputUrl}
              alt="Input"
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Original
            </div>
          </div>

          {/* Output Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            {status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {status === 'pending' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <span className="text-sm text-muted-foreground">Waiting...</span>
              </div>
            )}
            {status === 'skipped' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {skipReason || 'Skipped'}
                </span>
              </div>
            )}
            {status === 'failed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
            {outputUrl && status === 'completed' && (
              <img
                src={outputUrl}
                alt="Output"
                className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
                onClick={() => setZoomed('output')}
              />
            )}
            {outputUrl && status === 'completed' && (
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Generated
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {status === 'completed' && (
            <>
              <Button size="sm" variant="default" onClick={onApprove}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
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
      </CardContent>

      {/* Zoom Modal */}
      {zoomed && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
          onClick={() => setZoomed(null)}
        >
          <img
            src={zoomed === 'input' ? inputUrl : outputUrl!}
            alt="Zoomed"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </Card>
  );
}
```

**Step 7: Write the progress modal component**

```typescript
// src/shared/blocks/ai-playground/components/progress-modal.tsx

'use client';

import { useState, useEffect } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Loader2, X, AlertCircle } from 'lucide-react';

interface ProgressModalProps {
  jobId: string;
  onClose: () => void;
}

export function ProgressModal({ jobId, onClose }: ProgressModalProps) {
  const [progress, setProgress] = useState({ current: 0, total: 10, percentage: 0 });
  const [logs, setLogs] = useState<Array<{ level: string; message: string; timestamp: string }>>([]);
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');

  useEffect(() => {
    // TODO: Implement SSE polling
    const interval = setInterval(() => {
      // Simulated progress for now
      setProgress(prev => {
        if (prev.current >= prev.total) {
          clearInterval(interval);
          setStatus('completed');
          return prev;
        }
        return {
          ...prev,
          current: prev.current + 1,
          percentage: Math.round(((prev.current + 1) / prev.total) * 100),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Processing Progress</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant={
              status === 'completed' ? 'default' :
              status === 'failed' ? 'destructive' :
              'secondary'
            }>
              {status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {status === 'processing' && 'Processing'}
              {status === 'completed' && 'Completed'}
              {status === 'failed' && 'Failed'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>

          {/* Progress Bar */}
          <Progress value={progress.percentage} className="h-2" />

          {/* Logs */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Logs</h4>
            <ScrollArea className="h-48 rounded-md border p-4">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    'flex gap-2',
                    log.level === 'error' && 'text-destructive',
                    log.level === 'warning' && 'text-yellow-600',
                    log.level === 'info' && 'text-blue-600'
                  )}>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-muted-foreground">No logs yet...</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {status === 'processing' && (
              <Button variant="destructive">
                Cancel Job
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 8: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/aiplayground/
git add src/shared/blocks/ai-playground/
git commit -m "feat: add AI Playground main processing page"
```

---

## Task 6: Create Zustand Store

**Files:**
- Create: `src/shared/blocks/ai-playground/lib/store.ts`
- Modify: `package.json` (add zustand dependency)

**Step 1: Install zustand dependency**

Run: `npm install zustand`
Expected: Package installed successfully

**Step 2: Write the store**

```typescript
// src/shared/blocks/ai-playground/lib/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type JobType = 'main_image' | 'secondary_image' | 'batch_optimize' | 'custom';
type ViewMode = 'continuous' | 'step_review';
type StatusFilter = 'all' | 'pending' | 'approved' | 'archived';

interface AiPlaygroundState {
  // Selection state
  selectedSkus: Set<string>;
  toggleSku: (sku: string) => void;
  clearSelection: () => void;
  selectAll: (skus: string[]) => void;

  // UI state
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;

  currentSku: string | null;
  setCurrentSku: (sku: string | null) => void;

  // Filters
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Processing options
  processingOptions: {
    jobType: JobType;
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

  // UI preferences
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  selectedSkus: new Set<string>(),
  currentView: 'continuous' as ViewMode,
  currentSku: null as string | null,
  statusFilter: 'all' as StatusFilter,
  searchQuery: '',
  processingOptions: {
    jobType: 'main_image' as JobType,
    professionalMode: false,
    consistencyMode: true,
  },
  reviewMode: {
    currentIndex: 0,
    autoAdvance: true,
  },
  sidebarOpen: true,
};

export const useAiPlaygroundStore = create<AiPlaygroundState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Selection
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
      setCurrentView: (view) => set({ currentView: view }),

      setCurrentSku: (sku) => set({ currentSku: sku }),

      // Filters
      setStatusFilter: (filter) => set({ statusFilter: filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      // Processing
      setProcessingOptions: (options) =>
        set((state) => ({
          processingOptions: { ...state.processingOptions, ...options },
        })),

      // Review
      setReviewMode: (options) =>
        set((state) => ({
          reviewMode: { ...state.reviewMode, ...options },
        })),

      // Sidebar
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'ai-playground-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        processingOptions: state.processingOptions,
        reviewMode: state.reviewMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

**Step 3: Commit**

```bash
git add src/shared/blocks/ai-playground/lib/store.ts package.json package-lock.json
git commit -m "feat: add AI Playground Zustand store"
```

---

## Task 7: Create Review Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/aiplayground/review/page.tsx`
- Create: `src/shared/blocks/ai-playground/components/review-workflow.tsx`

**Step 1: Write the review page**

```typescript
// src/app/[locale]/(user)/dashboard/aiplayground/review/page.tsx

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { ReviewContent } from '@/shared/blocks/ai-playground/review-content';

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.aiplayground.review');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: 'AI Playground', url: '/dashboard/aiplayground' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <ReviewContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 2: Write the review content component**

```typescript
// src/shared/blocks/ai-playground/review-content.tsx

'use client';

import { useState } from 'react';

import { ReviewWorkflow } from './components/review-workflow';
import { useAiPlaygroundStore } from './lib/store';

export function ReviewContent() {
  const [workflowItems, setWorkflowItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { reviewMode, setReviewMode } = useAiPlaygroundStore();

  const currentItem = workflowItems[currentIndex];

  const handleApprove = async () => {
    // TODO: Implement approve action
    if (reviewMode.autoAdvance && currentIndex < workflowItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReject = async () => {
    // TODO: Implement reject action
    if (reviewMode.autoAdvance && currentIndex < workflowItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < workflowItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {workflowItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No items to review</p>
          <p className="text-sm">Complete processing jobs to see items here</p>
        </div>
      ) : (
        <ReviewWorkflow
          items={workflowItems}
          currentIndex={currentIndex}
          currentItem={currentItem}
          onApprove={handleApprove}
          onReject={handleReject}
          onPrevious={handlePrevious}
          onNext={handleNext}
          autoAdvance={reviewMode.autoAdvance}
          onToggleAutoAdvance={(checked) => setReviewMode({ autoAdvance: checked })}
        />
      )}
    </div>
  );
}
```

**Step 3: Write the review workflow component**

```typescript
// src/shared/blocks/ai-playground/components/review-workflow.tsx

'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImagePair } from './image-pair';

interface ReviewWorkflowProps {
  items: any[];
  currentIndex: number;
  currentItem: any;
  onApprove: () => void;
  onReject: () => void;
  onPrevious: () => void;
  onNext: () => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: (checked: boolean) => void;
}

export function ReviewWorkflow({
  items,
  currentIndex,
  currentItem,
  onApprove,
  onReject,
  onPrevious,
  onNext,
  autoAdvance,
  onToggleAutoAdvance,
}: ReviewWorkflowProps) {
  if (!currentItem) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Reviewing {currentIndex + 1} of {items.length}
        </p>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">{currentItem.sku}</h3>

          {/* Image Pairs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentItem.imagePairs?.map((pair: any) => (
              <ImagePair
                key={pair.id}
                inputUrl={pair.inputUrl}
                outputUrl={pair.outputUrl}
                status={pair.status}
                isMainImage={pair.isMainImage}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={onNext}
                disabled={currentIndex === items.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-advance"
                  checked={autoAdvance}
                  onCheckedChange={onToggleAutoAdvance}
                />
                <Label htmlFor="auto-advance" className="text-sm">
                  Auto Advance
                </Label>
              </div>

              <Button variant="destructive" onClick={onReject}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button onClick={onApprove}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/aiplayground/review/
git add src/shared/blocks/ai-playground/review-content.tsx
git add src/shared/blocks/ai-playground/components/review-workflow.tsx
git commit -m "feat: add AI Playground review page"
```

---

## Task 8: Create History Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/aiplayground/history/page.tsx`
- Create: `src/shared/blocks/ai-playground/components/history-table.tsx`

**Step 1: Write the history page**

```typescript
// src/app/[locale]/(user)/dashboard/aiplayground/history/page.tsx

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { HistoryContent } from '@/shared/blocks/ai-playground/history-content';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.aiplayground.history');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: 'AI Playground', url: '/dashboard/aiplayground' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <HistoryContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 2: Write the history content component**

```typescript
// src/shared/blocks/ai-playground/history-content.tsx

'use client';

import { useState } from 'react';

import { HistoryTable } from './components/history-table';
import { JobLogsModal } from './components/job-logs-modal';

export function HistoryContent() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleViewLogs = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowLogs(true);
  };

  return (
    <div className="space-y-6">
      <HistoryTable
        jobs={jobs}
        onViewDetails={(jobId) => console.log('View details:', jobId)}
        onViewLogs={handleViewLogs}
        onCancel={(jobId) => console.log('Cancel job:', jobId)}
      />

      {showLogs && selectedJobId && (
        <JobLogsModal
          jobId={selectedJobId}
          onClose={() => setShowLogs(false)}
        />
      )}
    </div>
  );
}
```

**Step 3: Write the history table component**

```typescript
// src/shared/blocks/ai-playground/components/history-table.tsx

'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { FileText, Eye, XCircle } from 'lucide-react';

interface HistoryTableProps {
  jobs: Array<{
    id: string;
    jobType: string;
    status: string;
    progressPercentage: number;
    createdAt: string;
    completedAt?: string;
  }>;
  onViewDetails: (jobId: string) => void;
  onViewLogs: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}

export function HistoryTable({
  jobs,
  onViewDetails,
  onViewLogs,
  onCancel,
}: HistoryTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'processing': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No jobs found
              </TableCell>
            </TableRow>
          ) : (
            jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-sm">
                  {job.id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  {job.jobType.replace('_', ' ')}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(job.status)}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${job.progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {job.progressPercentage}%
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(job.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(job.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewLogs(job.id)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    {(job.status === 'pending' || job.status === 'processing') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCancel(job.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 4: Write the job logs modal component**

```typescript
// src/shared/blocks/ai-playground/components/job-logs-modal.tsx

'use client';

import { useState, useEffect } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { aiApi } from '../lib/api-client';

interface JobLogsModalProps {
  jobId: string;
  onClose: () => void;
}

export function JobLogsModal({ jobId, onClose }: JobLogsModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiApi.getJobLogs(jobId).then(res => {
      if (res.code === 0) {
        setLogs(res.data.logs);
      }
      setLoading(false);
    });
  }, [jobId]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Job Logs</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-96 rounded-md border p-4">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {log.level}
                    </Badge>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 5: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/aiplayground/history/
git add src/shared/blocks/ai-playground/history-content.tsx
git add src/shared/blocks/ai-playground/components/history-table.tsx
git add src/shared/blocks/ai-playground/components/job-logs-modal.tsx
git commit -m "feat: add AI Playground history page"
```

---

## Task 9: Create Settings Page

**Files:**
- Create: `src/app/[locale]/(user)/dashboard/aiplayground/settings/page.tsx`
- Create: `src/shared/blocks/ai-playground/components/settings-form.tsx`

**Step 1: Write the settings page**

```typescript
// src/app/[locale]/(user)/dashboard/aiplayground/settings/page.tsx

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { SettingsContent } from '@/shared/blocks/ai-playground/settings-content';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard.aiplayground.settings');

  const crumbs: Crumb[] = [
    { title: t('crumb_dashboard'), url: '/dashboard' },
    { title: 'AI Playground', url: '/dashboard/aiplayground' },
    { title: t('crumb'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <div className="p-6">
          <SettingsContent />
        </div>
      </Main>
    </>
  );
}
```

**Step 2: Write the settings content component**

```typescript
// src/shared/blocks/ai-playground/settings-content.tsx

'use client';

import { useState, useEffect } from 'react';

import { SettingsForm } from './components/settings-form';
import { aiApi } from './lib/api-client';
import type { UserSettings } from './lib/types';

export function SettingsContent() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    aiApi.getSettings().then(res => {
      if (res.code === 0) {
        setSettings(res.data);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (updates: Partial<UserSettings>) => {
    setSaving(true);
    try {
      const res = await aiApi.updateSettings(updates);
      if (res.code === 0) {
        setSettings(res.data);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <div className="max-w-2xl">
      <SettingsForm settings={settings} onSave={handleSave} saving={saving} />
    </div>
  );
}
```

**Step 3: Write the settings form component**

```typescript
// src/shared/blocks/ai-playground/components/settings-form.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { UserSettings } from '../lib/types';

interface SettingsFormProps {
  settings: UserSettings;
  onSave: (updates: Partial<UserSettings>) => void;
  saving: boolean;
}

export function SettingsForm({ settings, onSave, saving }: SettingsFormProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(localSettings);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint</Label>
            <Input
              id="apiEndpoint"
              value={localSettings.apiEndpoint}
              onChange={(e) => setLocalSettings({ ...localSettings, apiEndpoint: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Input
              id="defaultModel"
              value={localSettings.defaultModel}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultModel: e.target.value })}
              placeholder="gpt-4-vision-preview"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxConcurrent">Max Concurrent Jobs</Label>
            <Input
              id="maxConcurrent"
              type="number"
              min="1"
              max="10"
              value={localSettings.maxConcurrentJobs}
              onChange={(e) => setLocalSettings({ ...localSettings, maxConcurrentJobs: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Professional Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use advanced prompts for higher quality
              </p>
            </div>
            <Switch
              checked={localSettings.enableProfessionalMode}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enableProfessionalMode: checked })}
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
              checked={localSettings.consistencyMode}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, consistencyMode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>UI Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultView">Default View</Label>
            <Select
              value={localSettings.defaultView}
              onValueChange={(value) => setLocalSettings({ ...localSettings, defaultView: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continuous">Continuous Processing</SelectItem>
                <SelectItem value="step_review">Step Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemsPerPage">Items Per Page</Label>
            <Input
              id="itemsPerPage"
              type="number"
              min="10"
              max="100"
              value={localSettings.itemsPerPage}
              onChange={(e) => setLocalSettings({ ...localSettings, itemsPerPage: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Advance</Label>
              <p className="text-xs text-muted-foreground">
                Automatically advance to next item in review mode
              </p>
            </div>
            <Switch
              checked={localSettings.autoAdvance}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoAdvance: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storageProvider">Storage Provider</Label>
            <Select
              value={localSettings.storageProvider}
              onValueChange={(value) => setLocalSettings({ ...localSettings, storageProvider: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="s3">AWS S3</SelectItem>
                <SelectItem value="oss">Aliyun OSS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/[locale]/(user)/dashboard/aiplayground/settings/
git add src/shared/blocks/ai-playground/settings-content.tsx
git add src/shared/blocks/ai-playground/components/settings-form.tsx
git commit -m "feat: add AI Playground settings page"
```

---

## Task 10: Create Custom Hooks

**Files:**
- Create: `src/shared/blocks/ai-playground/hooks/use-ai-jobs.ts`
- Create: `src/shared/blocks/ai-playground/hooks/use-ai-workflow.ts`
- Create: `src/shared/blocks/ai-playground/hooks/use-ai-settings.ts`

**Step 1: Write useAiJobs hook**

```typescript
// src/shared/blocks/ai-playground/hooks/use-ai-jobs.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { aiApi } from '../lib/api-client';
import type { Job, CreateJobInput } from '../lib/types';

interface UseAiJobsOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export function useAiJobs(options?: UseAiJobsOptions) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiApi.getJobs();
      if (res.code === 0) {
        setJobs(res.data.items);
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
    const res = await aiApi.createJob(input);
    if (res.code === 0) {
      await fetchJobs();
      return res.data;
    }
    throw new Error(res.message || 'Failed to create job');
  }, [fetchJobs]);

  const cancelJob = useCallback(async (jobId: string) => {
    const res = await aiApi.cancelJob(jobId);
    if (res.code === 0) {
      await fetchJobs();
      return res.data;
    }
    throw new Error(res.message || 'Failed to cancel job');
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

**Step 2: Write useAiWorkflow hook**

```typescript
// src/shared/blocks/ai-playground/hooks/use-ai-workflow.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { aiApi } from '../lib/api-client';
import type { WorkflowState } from '../lib/types';

export function useAiWorkflow(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const [items, setItems] = useState<WorkflowState[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiApi.getWorkflow(params || {});
      if (res.code === 0) {
        setItems(res.data.items);
        setTotal(res.data.total);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const approveItems = useCallback(async (actions: Array<{
    type: 'approve' | 'reject';
    targetId: string;
    targetType: 'sku' | 'image_pair';
  }>) => {
    const res = await aiApi.approveWorkflow(actions);
    if (res.code === 0) {
      await fetchWorkflow();
      return res.data;
    }
    throw new Error(res.message || 'Failed to approve items');
  }, [fetchWorkflow]);

  const archiveItems = useCallback(async (workflowStateIds: string[]) => {
    const res = await aiApi.archiveWorkflow(workflowStateIds);
    if (res.code === 0) {
      await fetchWorkflow();
      return res.data;
    }
    throw new Error(res.message || 'Failed to archive items');
  }, [fetchWorkflow]);

  return {
    items,
    total,
    loading,
    error,
    refetch: fetchWorkflow,
    approveItems,
    archiveItems,
  };
}
```

**Step 3: Write useAiSettings hook**

```typescript
// src/shared/blocks/ai-playground/hooks/use-ai-settings.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { aiApi } from '../lib/api-client';
import type { UserSettings } from '../lib/types';

export function useAiSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiApi.getSettings();
      if (res.code === 0) {
        setSettings(res.data);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const res = await aiApi.updateSettings(updates);
    if (res.code === 0) {
      setSettings(res.data);
      return res.data;
    }
    throw new Error(res.message || 'Failed to update settings');
  }, []);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings,
  };
}
```

**Step 4: Commit**

```bash
git add src/shared/blocks/ai-playground/hooks/
git commit -m "feat: add AI Playground custom hooks"
```

---

## Task 11: Update Dashboard Sidebar

**Files:**
- Modify: `src/config/locale/messages/en/dashboard/sidebar.json`
- Modify: `src/config/locale/messages/zh/dashboard/sidebar.json`

**Step 1: Update English sidebar**

```json
// Add to main_navs array in en/dashboard/sidebar.json

{
  "title": "AI Playground",
  "items": [
    {
      "title": "Overview",
      "url": "/dashboard/aiplayground",
      "icon": "Wand2"
    },
    {
      "title": "Review",
      "url": "/dashboard/aiplayground/review",
      "icon": "CheckCircle"
    },
    {
      "title": "History",
      "url": "/dashboard/aiplayground/history",
      "icon": "History"
    },
    {
      "title": "Settings",
      "url": "/dashboard/aiplayground/settings",
      "icon": "Settings"
    }
  ]
}
```

**Step 2: Update Chinese sidebar**

```json
// Add to main_navs array in zh/dashboard/sidebar.json

{
  "title": "AI 实验室",
  "items": [
    {
      "title": "概览",
      "url": "/dashboard/aiplayground",
      "icon": "Wand2"
    },
    {
      "title": "审核",
      "url": "/dashboard/aiplayground/review",
      "icon": "CheckCircle"
    },
    {
      "title": "历史",
      "url": "/dashboard/aiplayground/history",
      "icon": "History"
    },
    {
      "title": "设置",
      "url": "/dashboard/aiplayground/settings",
      "icon": "Settings"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add src/config/locale/messages/en/dashboard/sidebar.json
git add src/config/locale/messages/zh/dashboard/sidebar.json
git commit -m "feat: add AI Playground to dashboard sidebar"
```

---

## Task 12: Add Backend API Routes

**Files:**
- Create: `src/app/api/ai-playground/jobs/route.ts`
- Create: `src/app/api/ai-playground/jobs/[id]/route.ts`
- Create: `src/app/api/ai-playground/workflow/route.ts`
- Create: `src/app/api/ai-playground/settings/route.ts`

**Step 1: Write jobs route**

```typescript
// src/app/api/ai-playground/jobs/route.ts

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiDb } from '@/lib/db/ai-playground';
import { nanoid } from 'nanoid';

// GET - List jobs
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    const jobs = await aiDb.getUserJobs(user.id, {
      limit,
      offset,
      status: status || undefined,
    });

    const total = jobs.length; // TODO: Implement count query

    return respData({
      items: jobs,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return respErr('Failed to get jobs');
  }
}

// POST - Create job
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const { jobType, input, options } = body;

    // Validate input
    if (!jobType || !input || !input.skus || input.skus.length === 0) {
      return respErr('Invalid input: jobType and input.skus are required');
    }

    // Check quota
    const activeJobs = await aiDb.getUserJobs(user.id, {
      status: 'processing',
    });

    if (activeJobs.length >= 3) {
      return respErr('Maximum concurrent jobs reached');
    }

    // Create job
    const job = await aiDb.createJob({
      userId: user.id,
      jobType,
      inputData: input,
      promptTemplateId: options?.promptTemplateId,
      priority: options?.priority,
    });

    // TODO: Queue the job for processing

    return respData({
      jobId: job.id,
      status: job.status,
      totalItems: job.totalItems,
    });
  } catch (error) {
    console.error('Create job error:', error);
    return respErr('Failed to create job');
  }
}
```

**Step 2: Write job detail route**

```typescript
// src/app/api/ai-playground/jobs/[id]/route.ts

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiDb } from '@/lib/db/ai-playground';

// GET - Get job details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const job = await aiDb.getJob(id);

    if (!job) {
      return respErr('Job not found');
    }

    if (job.userId !== user.id) {
      return respErr('Access denied');
    }

    return respData(job);
  } catch (error) {
    console.error('Get job error:', error);
    return respErr('Failed to get job');
  }
}

// POST - Cancel job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { id } = await params;
    const job = await aiDb.getJob(id);

    if (!job) {
      return respErr('Job not found');
    }

    if (job.userId !== user.id) {
      return respErr('Access denied');
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return respErr('Cannot cancel completed job');
    }

    await aiDb.updateJobStatus(id, 'cancelled');

    return respData({
      jobId: id,
      status: 'cancelled',
    });
  } catch (error) {
    console.error('Cancel job error:', error);
    return respErr('Failed to cancel job');
  }
}
```

**Step 3: Write workflow route**

```typescript
// src/app/api/ai-playground/workflow/route.ts

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiDb } from '@/lib/db/ai-playground';

// GET - List workflow states
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // TODO: Implement workflow listing
    return respData({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    return respErr('Failed to get workflow');
  }
}

// POST - Approve/reject items
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const { actions } = body;

    // TODO: Implement approve/reject logic
    return respData({
      processed: actions.length,
      results: actions.map(a => ({
        targetId: a.targetId,
        success: true,
      })),
    });
  } catch (error) {
    console.error('Workflow action error:', error);
    return respErr('Failed to process workflow action');
  }
}
```

**Step 4: Write settings route**

```typescript
// src/app/api/ai-playground/settings/route.ts

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiDb } from '@/lib/db/ai-playground';

// GET - Get user settings
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const settings = await aiDb.getOrCreateUserSetting(user.id);

    // Don't return API key for security
    const { apiKey, ...safeSettings } = settings as any;

    return respData(safeSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    return respErr('Failed to get settings');
  }
}

// PUT - Update user settings
export async function PUT(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();

    // Encrypt API key if provided
    const updates = { ...body };
    if (updates.apiKey) {
      // TODO: Implement API key encryption
    }

    await aiDb.updateUserSetting(user.id, updates);

    const updatedSettings = await aiDb.getOrCreateUserSetting(user.id);
    const { apiKey, ...safeSettings } = updatedSettings as any;

    return respData(safeSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    return respErr('Failed to update settings');
  }
}
```

**Step 5: Commit**

```bash
git add src/app/api/ai-playground/
git commit -m "feat: add AI Playground API routes"
```

---

## Task 13: Run Migration and Test

**Files:**
- Test: Database migration verification
- Test: Frontend smoke test

**Step 1: Run database migration**

Run: `npm run db:push`
Expected: All AI Playground tables created successfully

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build completes without errors

**Step 3: Check for missing imports**

Run: `npm run lint`
Expected: No import errors

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete AI Playground implementation"
```

---

## Execution Notes

### Testing Checklist

After completing all tasks:
- [ ] Navigate to `/dashboard/aiplayground` - page should load
- [ ] Settings page opens - form renders
- [ ] Review page loads - UI displays
- [ ] History page loads - table shows
- [ ] Sidebar navigation works - all links functional
- [ ] API routes respond - no 404 errors
- [ ] Database tables exist - verify via db client

### Known Limitations

This implementation creates the frontend foundation. Backend job processing, SSE streaming, and actual AI integration are marked as TODO and require additional implementation.

### Next Steps After Implementation

1. Implement backend job queue worker
2. Add SSE streaming for real-time progress
3. Integrate with external AI API
4. Add file upload handling
5. Implement actual image processing logic
6. Add comprehensive error handling
7. Write unit and integration tests
8. Add performance monitoring
