/**
 * AI Playground related database operations
 */
import { db } from '@/core/db';
import {
  aiJob,
  aiJobLog,
  aiWorkflowState,
  aiImagePair,
  aiPromptTemplate,
  aiUserSetting,
  aiDownloadQueue,
  aiPromptGroup,
  aiPromptTemplateV2,
  aiUserPromptPreference,
} from '@/config/db/schema';
import { eq, desc, and, SQL, isNull, not } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

// ========================================
// Types
// ========================================

export interface CreateAiJobInput {
  userId: string;
  type: string;
  config: Record<string, any>;
  sourceImageUrls: string[];
}

export interface CreateAiWorkflowStateInput {
  userId: string;
  name: string;
  state: string;
  imagePairs: Array<{ sourceUrl: string; resultUrl: string | null; approved: boolean }>;
  config: Record<string, any>;
}

export interface CreateAiImagePairInput {
  userId: string;
  workflowStateId?: string;
  jobId?: string;
  sourceUrl: string;
  resultUrl?: string;
  approved?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateAiPromptTemplateInput {
  userId: string;
  name: string;
  type: string;
  template: string;
  isDefault?: boolean;
}

export interface CreateAiDownloadQueueInput {
  userId: string;
  imagePairId: string;
  status: string;
  downloadUrl?: string;
  expiresAt?: Date;
}

// ========================================
// Database Operations Class
// ========================================

export class AiPlaygroundDb {
  // ========================================
  // AI Job Operations
  // ========================================

  /**
   * Create AI job
   */
  async createJob(input: CreateAiJobInput) {
    const [job] = await db()
      .insert(aiJob)
      .values({
        id: getUuid(),
        userId: input.userId,
        type: input.type,
        status: 'pending',
        config: input.config as any,
        sourceImageUrls: input.sourceImageUrls as any,
        resultImageUrls: null,
        progress: 0,
      })
      .returning();

    return job;
  }

  /**
   * Update job status and progress
   */
  async updateJob(
    jobId: string,
    userId: string,
    updates: {
      status?: string;
      progress?: number;
      resultImageUrls?: string[];
      errorMessage?: string;
      startedAt?: Date;
      completedAt?: Date;
    }
  ) {
    const [job] = await db()
      .update(aiJob)
      .set({
        ...updates,
        resultImageUrls: updates.resultImageUrls as any,
        updatedAt: new Date(),
      })
      .where(and(eq(aiJob.id, jobId), eq(aiJob.userId, userId)))
      .returning();

    return job;
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(
    userId: string,
    options?: { limit?: number; status?: string; type?: string }
  ) {
    const limit = options?.limit || 20;

    let whereCondition: SQL<unknown> | undefined = eq(aiJob.userId, userId);
    if (options?.status) {
      whereCondition = and(whereCondition, eq(aiJob.status, options.status));
    }
    if (options?.type) {
      whereCondition = and(whereCondition, eq(aiJob.type, options.type));
    }

    return await db()
      .select()
      .from(aiJob)
      .where(whereCondition)
      .orderBy(desc(aiJob.createdAt))
      .limit(limit);
  }

  /**
   * Get single job
   */
  async getJob(jobId: string, userId: string) {
    const [job] = await db()
      .select()
      .from(aiJob)
      .where(and(eq(aiJob.id, jobId), eq(aiJob.userId, userId)))
      .limit(1);

    return job;
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: string, userId: string) {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new Error('Job not found');
    }

    await db().delete(aiJob).where(eq(aiJob.id, jobId));
    return job;
  }

  // ========================================
  // Job Log Operations
  // ========================================

  /**
   * Create job log entry
   */
  async createJobLog(input: {
    jobId: string;
    level: string;
    message: string;
    metadata?: Record<string, any>;
  }) {
    const [log] = await db()
      .insert(aiJobLog)
      .values({
        id: getUuid(),
        jobId: input.jobId,
        level: input.level,
        message: input.message,
        metadata: input.metadata as any,
      })
      .returning();

    return log;
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string, limit: number = 100) {
    return await db()
      .select()
      .from(aiJobLog)
      .where(eq(aiJobLog.jobId, jobId))
      .orderBy(desc(aiJobLog.createdAt))
      .limit(limit);
  }

  // ========================================
  // Workflow State Operations
  // ========================================

  /**
   * Create workflow state
   */
  async createWorkflowState(input: CreateAiWorkflowStateInput) {
    const [state] = await db()
      .insert(aiWorkflowState)
      .values({
        id: getUuid(),
        userId: input.userId,
        name: input.name,
        state: input.state,
        imagePairs: input.imagePairs as any,
        config: input.config as any,
      })
      .returning();

    return state;
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(
    stateId: string,
    userId: string,
    updates: {
      state?: string;
      imagePairs?: Array<{ sourceUrl: string; resultUrl: string | null; approved: boolean }>;
      config?: Record<string, any>;
    }
  ) {
    const [state] = await db()
      .update(aiWorkflowState)
      .set({
        ...updates,
        imagePairs: updates.imagePairs as any,
        config: updates.config as any,
        updatedAt: new Date(),
      })
      .where(and(eq(aiWorkflowState.id, stateId), eq(aiWorkflowState.userId, userId)))
      .returning();

    return state;
  }

  /**
   * Get user's workflow states
   */
  async getUserWorkflowStates(userId: string, options?: { state?: string; limit?: number }) {
    const limit = options?.limit || 20;

    let whereCondition: SQL<unknown> | undefined = eq(aiWorkflowState.userId, userId);
    if (options?.state) {
      whereCondition = and(whereCondition, eq(aiWorkflowState.state, options.state));
    }

    return await db()
      .select()
      .from(aiWorkflowState)
      .where(whereCondition)
      .orderBy(desc(aiWorkflowState.createdAt))
      .limit(limit);
  }

  /**
   * Get single workflow state
   */
  async getWorkflowState(stateId: string, userId: string) {
    const [state] = await db()
      .select()
      .from(aiWorkflowState)
      .where(and(eq(aiWorkflowState.id, stateId), eq(aiWorkflowState.userId, userId)))
      .limit(1);

    return state;
  }

  /**
   * Delete workflow state
   */
  async deleteWorkflowState(stateId: string, userId: string) {
    const state = await this.getWorkflowState(stateId, userId);
    if (!state) {
      throw new Error('Workflow state not found');
    }

    await db().delete(aiWorkflowState).where(eq(aiWorkflowState.id, stateId));
    return state;
  }

  // ========================================
  // Image Pair Operations
  // ========================================

  /**
   * Create image pair
   */
  async createImagePair(input: CreateAiImagePairInput) {
    const [pair] = await db()
      .insert(aiImagePair)
      .values({
        id: getUuid(),
        userId: input.userId,
        workflowStateId: input.workflowStateId || null,
        jobId: input.jobId || null,
        sourceUrl: input.sourceUrl,
        resultUrl: input.resultUrl || null,
        approved: input.approved || false,
        archived: false,
        metadata: input.metadata as any,
      })
      .returning();

    return pair;
  }

  /**
   * Update image pair
   */
  async updateImagePair(
    pairId: string,
    userId: string,
    updates: {
      resultUrl?: string;
      approved?: boolean;
      archived?: boolean;
      metadata?: Record<string, any>;
    }
  ) {
    const [pair] = await db()
      .update(aiImagePair)
      .set({
        ...updates,
        metadata: updates.metadata as any,
        updatedAt: new Date(),
      })
      .where(and(eq(aiImagePair.id, pairId), eq(aiImagePair.userId, userId)))
      .returning();

    return pair;
  }

  /**
   * Get user's image pairs
   */
  async getUserImagePairs(
    userId: string,
    options?: {
      workflowStateId?: string;
      jobId?: string;
      approved?: boolean;
      archived?: boolean;
      limit?: number;
    }
  ) {
    const limit = options?.limit || 50;

    let whereCondition: SQL<unknown> | undefined = eq(aiImagePair.userId, userId);
    if (options?.workflowStateId !== undefined) {
      whereCondition = and(whereCondition, eq(aiImagePair.workflowStateId, options.workflowStateId));
    }
    if (options?.jobId !== undefined) {
      whereCondition = and(whereCondition, eq(aiImagePair.jobId, options.jobId));
    }
    if (options?.approved !== undefined) {
      whereCondition = and(whereCondition, eq(aiImagePair.approved, options.approved));
    }
    if (options?.archived !== undefined) {
      whereCondition = and(whereCondition, eq(aiImagePair.archived, options.archived));
    }

    return await db()
      .select()
      .from(aiImagePair)
      .where(whereCondition)
      .orderBy(desc(aiImagePair.createdAt))
      .limit(limit);
  }

  /**
   * Get single image pair
   */
  async getImagePair(pairId: string, userId: string) {
    const [pair] = await db()
      .select()
      .from(aiImagePair)
      .where(and(eq(aiImagePair.id, pairId), eq(aiImagePair.userId, userId)))
      .limit(1);

    return pair;
  }

  /**
   * Delete image pair
   */
  async deleteImagePair(pairId: string, userId: string) {
    const pair = await this.getImagePair(pairId, userId);
    if (!pair) {
      throw new Error('Image pair not found');
    }

    await db().delete(aiImagePair).where(eq(aiImagePair.id, pairId));
    return pair;
  }

  // ========================================
  // Prompt Template Operations
  // ========================================

  /**
   * Create prompt template
   */
  async createPromptTemplate(input: CreateAiPromptTemplateInput) {
    const [template] = await db()
      .insert(aiPromptTemplate)
      .values({
        id: getUuid(),
        userId: input.userId,
        name: input.name,
        type: input.type,
        template: input.template,
        isDefault: input.isDefault || false,
      })
      .returning();

    return template;
  }

  /**
   * Update prompt template
   */
  async updatePromptTemplate(
    templateId: string,
    userId: string,
    updates: {
      name?: string;
      template?: string;
      isDefault?: boolean;
    }
  ) {
    const [template] = await db()
      .update(aiPromptTemplate)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(aiPromptTemplate.id, templateId), eq(aiPromptTemplate.userId, userId)))
      .returning();

    return template;
  }

  /**
   * Get user's prompt templates
   */
  async getUserPromptTemplates(userId: string, options?: { type?: string; limit?: number }) {
    const limit = options?.limit || 50;

    let whereCondition: SQL<unknown> | undefined = eq(aiPromptTemplate.userId, userId);
    if (options?.type) {
      whereCondition = and(whereCondition, eq(aiPromptTemplate.type, options.type));
    }

    return await db()
      .select()
      .from(aiPromptTemplate)
      .where(whereCondition)
      .orderBy(desc(aiPromptTemplate.isDefault), desc(aiPromptTemplate.createdAt))
      .limit(limit);
  }

  /**
   * Get single prompt template
   */
  async getPromptTemplate(templateId: string, userId: string) {
    const [template] = await db()
      .select()
      .from(aiPromptTemplate)
      .where(and(eq(aiPromptTemplate.id, templateId), eq(aiPromptTemplate.userId, userId)))
      .limit(1);

    return template;
  }

  /**
   * Delete prompt template
   */
  async deletePromptTemplate(templateId: string, userId: string) {
    const template = await this.getPromptTemplate(templateId, userId);
    if (!template) {
      throw new Error('Prompt template not found');
    }

    await db().delete(aiPromptTemplate).where(eq(aiPromptTemplate.id, templateId));
    return template;
  }

  // ========================================
  // User Settings Operations
  // ========================================

  /**
   * Get or create user settings
   */
  async getUserSettings(userId: string) {
    let [settings] = await db()
      .select()
      .from(aiUserSetting)
      .where(eq(aiUserSetting.userId, userId))
      .limit(1);

    if (!settings) {
      [settings] = await db()
        .insert(aiUserSetting)
        .values({
          id: getUuid(),
          userId,
          defaultQuality: 'standard',
          defaultFormat: 'png',
          autoApprove: false,
          batchSize: 10,
          notificationEnabled: true,
        })
        .returning();
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    userId: string,
    updates: {
      defaultQuality?: string;
      defaultFormat?: string;
      autoApprove?: boolean;
      batchSize?: number;
      notificationEnabled?: boolean;
    }
  ) {
    const [settings] = await db()
      .update(aiUserSetting)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiUserSetting.userId, userId))
      .returning();

    return settings;
  }

  // ========================================
  // Download Queue Operations
  // ========================================

  /**
   * Create download queue entry
   */
  async createDownloadQueueEntry(input: CreateAiDownloadQueueInput) {
    const [entry] = await db()
      .insert(aiDownloadQueue)
      .values({
        id: getUuid(),
        userId: input.userId,
        imagePairId: input.imagePairId,
        status: input.status,
        downloadUrl: input.downloadUrl || null,
        expiresAt: input.expiresAt || null,
      })
      .returning();

    return entry;
  }

  /**
   * Update download queue entry
   */
  async updateDownloadQueueEntry(
    entryId: string,
    userId: string,
    updates: {
      status?: string;
      downloadUrl?: string;
      expiresAt?: Date;
    }
  ) {
    const [entry] = await db()
      .update(aiDownloadQueue)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(aiDownloadQueue.id, entryId), eq(aiDownloadQueue.userId, userId)))
      .returning();

    return entry;
  }

  /**
   * Get user's download queue
   */
  async getUserDownloadQueue(userId: string, options?: { status?: string; limit?: number }) {
    const limit = options?.limit || 20;

    let whereCondition: SQL<unknown> | undefined = eq(aiDownloadQueue.userId, userId);
    if (options?.status) {
      whereCondition = and(whereCondition, eq(aiDownloadQueue.status, options.status));
    }

    return await db()
      .select()
      .from(aiDownloadQueue)
      .where(whereCondition)
      .orderBy(desc(aiDownloadQueue.createdAt))
      .limit(limit);
  }

  /**
   * Clean expired download queue entries
   */
  async cleanExpiredDownloads(userId: string) {
    const now = new Date();
    await db()
      .delete(aiDownloadQueue)
      .where(
        and(
          eq(aiDownloadQueue.userId, userId),
          not(isNull(aiDownloadQueue.expiresAt)),
          // @ts-ignore - comparing timestamps
          eq(aiDownloadQueue.expiresAt, now)
        )
      );
  }

  // ========================================
  // Statistics Operations
  // ========================================

  /**
   * Get job statistics for user
   */
  async getUserJobStats(userId: string) {
    const jobs = await this.getUserJobs(userId, { limit: 1000 });

    return {
      total: jobs.length,
      pending: jobs.filter((t: any) => t.status === 'pending').length,
      processing: jobs.filter((t: any) => t.status === 'processing').length,
      completed: jobs.filter((t: any) => t.status === 'completed').length,
      failed: jobs.filter((t: any) => t.status === 'failed').length,
    };
  }

  /**
   * Get image pair statistics for user
   */
  async getUserImageStats(userId: string) {
    const pairs = await this.getUserImagePairs(userId, { limit: 10000 });

    return {
      total: pairs.length,
      approved: pairs.filter((p: any) => p.approved).length,
      archived: pairs.filter((p: any) => p.archived).length,
      pending: pairs.filter((p: any) => !p.approved && !p.archived).length,
    };
  }

  /**
   * Get daily job trends for specified period
   */
  async getDailyJobTrends(userId: string, days: number = 7) {
    const jobs = await this.getUserJobs(userId, { limit: 100000 });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats: Record<string, { jobs: number; completed: number }> = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { jobs: 0, completed: 0 };
    }

    // Fill in actual data
    jobs.forEach((job: any) => {
      const dateStr = new Date(job.createdAt).toISOString().split('T')[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].jobs += 1;
        if (job.status === 'completed') {
          dailyStats[dateStr].completed += 1;
        }
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      jobs: stats.jobs,
      completed: stats.completed,
    }));
  }

  // ========================================
  // Prompt Group Operations
  // ========================================

  /**
   * Create prompt group with templates
   */
  async createPromptGroup(input: {
    userId?: string;
    name: string;
    description?: string;
    templates: Array<{ key: string; content: string; language?: string; category?: string }>;
    isSystemDefault?: boolean;
  }) {
    const groupId = input.userId ? getUuid() : `g${Date.now()}`;

    const [group] = await db()
      .insert(aiPromptGroup)
      .values({
        id: groupId,
        userId: input.userId || null,
        name: input.name,
        description: input.description || null,
        isSystemDefault: input.isSystemDefault || false,
        isActive: true,
      })
      .returning();

    // Bulk insert templates
    if (input.templates.length > 0) {
      await db()
        .insert(aiPromptTemplateV2)
        .values(
          input.templates.map((template) => ({
            id: getUuid(),
            promptGroupId: groupId,
            templateKey: template.key,
            templateContent: template.content,
            language: template.language || 'cn',
            category: template.category || null,
          }))
        );
    }

    return group;
  }

  /**
   * Get all prompt groups (user + system defaults)
   */
  async getPromptGroups(userId?: string) {
    const userGroups = userId
      ? await db()
          .select()
          .from(aiPromptGroup)
          .where(and(eq(aiPromptGroup.userId, userId), eq(aiPromptGroup.isActive, true)))
      : [];

    const systemGroups = await db()
      .select()
      .from(aiPromptGroup)
      .where(eq(aiPromptGroup.isSystemDefault, true));

    return [...userGroups, ...systemGroups];
  }

  /**
   * Get single prompt group with all templates
   */
  async getPromptGroupWithTemplates(groupId: string) {
    const [group] = await db()
      .select()
      .from(aiPromptGroup)
      .where(eq(aiPromptGroup.id, groupId))
      .limit(1);

    if (!group) return null;

    const templates = await db()
      .select()
      .from(aiPromptTemplateV2)
      .where(eq(aiPromptTemplateV2.promptGroupId, groupId));

    const promptTemplates: Record<string, string> = {};
    for (const template of templates) {
      promptTemplates[template.templateKey as any] = template.templateContent;
    }

    return {
      ...group,
      prompt_templates: promptTemplates,
    };
  }

  /**
   * Update prompt group
   */
  async updatePromptGroup(
    groupId: string,
    updates: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const [group] = await db()
      .update(aiPromptGroup)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiPromptGroup.id, groupId))
      .returning();

    return group;
  }

  /**
   * Delete prompt group (soft delete)
   */
  async deletePromptGroup(groupId: string) {
    const [group] = await db()
      .update(aiPromptGroup)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(aiPromptGroup.id, groupId))
      .returning();

    return group;
  }

  /**
   * Update prompt group with templates (replaces all templates)
   */
  async updatePromptGroupWithTemplates(
    groupId: string,
    updates: {
      name?: string;
      description?: string;
      isActive?: boolean;
      templates?: Array<{ key: string; content: string; language?: string; category?: string }>;
    }
  ) {
    const { templates, ...groupUpdates } = updates;

    // Update group basic info
    if (Object.keys(groupUpdates).length > 0) {
      await db()
        .update(aiPromptGroup)
        .set({
          ...groupUpdates,
          updatedAt: new Date(),
        })
        .where(eq(aiPromptGroup.id, groupId));
    }

    // Update templates if provided
    if (templates) {
      // Delete all existing templates for this group
      await db()
        .delete(aiPromptTemplateV2)
        .where(eq(aiPromptTemplateV2.promptGroupId, groupId));

      // Insert new templates
      if (templates.length > 0) {
        await db()
          .insert(aiPromptTemplateV2)
          .values(
            templates.map((template) => ({
              id: getUuid(),
              promptGroupId: groupId,
              templateKey: template.key,
              templateContent: template.content,
              language: template.language || 'cn',
              category: template.category || null,
            }))
          );
      }
    }

    // Return updated group with templates
    return await this.getPromptGroupWithTemplates(groupId);
  }

  // ========================================
  // Prompt Template Operations
  // ========================================

  /**
   * Update template in a group (V2)
   */
  async updatePromptTemplateV2(
    templateId: string,
    updates: {
      templateContent?: string;
      category?: string;
    }
  ) {
    const [template] = await db()
      .update(aiPromptTemplateV2)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiPromptTemplateV2.id, templateId))
      .returning();

    return template;
  }

  // ========================================
  // System Default Prompt Group
  // ========================================

  /**
   * Ensure system default prompt group exists
   * Creates it if missing, does nothing if already exists
   * Call this on app startup or when getting user preferences
   */
  async ensureSystemDefaultPromptGroup() {
    // Import defaults to get the config name
    const { SYSTEM_DEFAULT_GROUP_CONFIG, DEFAULT_SYSTEM_TEMPLATES, GROUP_PROMPT_KEYS } = await import('@/lib/db/seed/prompt-defaults');

    // Check if system default already exists by specific name
    const existing = await db()
      .select()
      .from(aiPromptGroup)
      .where(eq(aiPromptGroup.name, SYSTEM_DEFAULT_GROUP_CONFIG.name))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create system default prompt group
    const group = await this.createPromptGroup({
      userId: undefined, // System default has no user
      name: SYSTEM_DEFAULT_GROUP_CONFIG.name,
      description: SYSTEM_DEFAULT_GROUP_CONFIG.description,
      isSystemDefault: true,
      templates: GROUP_PROMPT_KEYS.map(key => ({
        key,
        content: DEFAULT_SYSTEM_TEMPLATES[key] || '',
        language: key.endsWith('_cn') ? 'cn' : 'en',
        category: 'system',
      })),
    });

    console.info('[ImageStudio] System default prompt group created', { groupId: group.id });
    return group;
  }

  // ========================================
  // User Prompt Preference Operations
  // ========================================

  /**
   * Get or create user prompt preferences
   * Ensures system default prompt group exists before creating user prefs
   */
  async getUserPromptPreferences(userId: string) {
    // NEW: Ensure system default exists first
    await this.ensureSystemDefaultPromptGroup();

    let [prefs] = await db()
      .select()
      .from(aiUserPromptPreference)
      .where(eq(aiUserPromptPreference.userId, userId))
      .limit(1);

    if (!prefs) {
      [prefs] = await db()
        .insert(aiUserPromptPreference)
        .values({
          id: getUuid(),
          userId,
          professionalModeEnabled: false,
          useEnglish: false,
          imageFormat: 'png',
          quality: 90,
          preserveOriginal: true,
        })
        .returning();
    }

    return prefs;
  }

  /**
   * Update user prompt preferences
   */
  async updateUserPromptPreferences(
    userId: string,
    updates: {
      activePromptGroupId?: string;
      professionalModeEnabled?: boolean;
      useEnglish?: boolean;
      defaultTemperature?: number;
      targetWidth?: number;
      targetHeight?: number;
      imageFormat?: string;
      quality?: number;
      preserveOriginal?: boolean;
      additionalSettings?: Record<string, any>;
    }
  ) {
    const [prefs] = await db()
      .update(aiUserPromptPreference)
      .set({
        ...updates,
        additionalSettings: updates.additionalSettings as any,
        updatedAt: new Date(),
      })
      .where(eq(aiUserPromptPreference.userId, userId))
      .returning();

    return prefs;
  }

  /**
   * Get workflow state by name
   */
  async getWorkflowStateByName(userId: string, name: string) {
    const [state] = await db()
      .select()
      .from(aiWorkflowState)
      .where(and(eq(aiWorkflowState.userId, userId), eq(aiWorkflowState.name, name)))
      .limit(1);

    return state;
  }
}

export const aiPlaygroundDb = new AiPlaygroundDb();
