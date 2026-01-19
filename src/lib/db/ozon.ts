/**
 * Ozon related database operations
 */
import { db } from '@/core/db';
import { ozonCredential, ozonTask } from '@/config/db/schema';
import { eq, desc, and, SQL, sql } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';
import type { OzonCredentialPlain } from '@/lib/crypto';

export interface CreateOzonCredentialInput {
  userId: string;
  name: string;
  encryptedData: string;
}

export interface CreateOzonTaskInput {
  userId: string;
  credentialId: string;
  articles: string[];
  field: string;
}

export class OzonDb {
  /**
   * Create Ozon credential
   */
  async createCredential(input: CreateOzonCredentialInput) {
    const [credential] = await db()
      .insert(ozonCredential)
      .values({
        id: getUuid(),
        userId: input.userId,
        name: input.name,
        encryptedData: input.encryptedData,
      })
      .returning();

    return credential;
  }

  /**
   * Get user's all credentials
   */
  async getUserCredentials(userId: string) {
    return await db()
      .select()
      .from(ozonCredential)
      .where(eq(ozonCredential.userId, userId))
      .orderBy(desc(ozonCredential.createdAt));
  }

  /**
   * Get single credential
   */
  async getCredential(id: string, userId: string) {
    const [credential] = await db()
      .select()
      .from(ozonCredential)
      .where(and(eq(ozonCredential.id, id), eq(ozonCredential.userId, userId)))
      .limit(1);

    return credential;
  }

  /**
   * Delete credential
   */
  async deleteCredential(id: string, userId: string) {
    const credential = await this.getCredential(id, userId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    await db().delete(ozonCredential).where(eq(ozonCredential.id, id));
    return credential;
  }

  /**
   * Update credential name
   */
  async updateCredentialName(id: string, userId: string, name: string) {
    const [credential] = await db()
      .update(ozonCredential)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(ozonCredential.id, id), eq(ozonCredential.userId, userId)))
      .returning();

    return credential;
  }

  /**
   * Create download task
   */
  async createTask(input: CreateOzonTaskInput) {
    const [task] = await db()
      .insert(ozonTask)
      .values({
        id: getUuid(),
        userId: input.userId,
        credentialId: input.credentialId,
        articles: input.articles as any, // JSON type
        field: input.field,
        status: 'pending',
        progress: 0,
      })
      .returning();

    return task;
  }

  /**
   * Update task status
   */
  async updateTask(
    taskId: string,
    userId: string,
    updates: {
      status?: string;
      progress?: number;
      result?: any;
      errorMessage?: string;
      totalArticles?: number;
      processedArticles?: number;
      totalImages?: number;
      successImages?: number;
      failedImages?: number;
      startedAt?: Date;
      completedAt?: Date;
    }
  ) {
    const [task] = await db()
      .update(ozonTask)
      .set({
        ...updates,
        result: updates.result as any,
        updatedAt: new Date(),
      })
      .where(and(eq(ozonTask.id, taskId), eq(ozonTask.userId, userId)))
      .returning();

    return task;
  }

  /**
   * Get user's task list
   */
  async getUserTasks(
    userId: string,
    options?: { limit?: number; status?: string }
  ) {
    const limit = options?.limit || 20;

    let whereCondition: SQL<unknown> | undefined = eq(ozonTask.userId, userId);
    if (options?.status) {
      whereCondition = and(whereCondition, eq(ozonTask.status, options.status));
    }

    return await db()
      .select()
      .from(ozonTask)
      .where(whereCondition)
      .orderBy(desc(ozonTask.createdAt))
      .limit(limit);
  }

  /**
   * Get single task
   */
  async getTask(taskId: string, userId: string) {
    const [task] = await db()
      .select()
      .from(ozonTask)
      .where(and(eq(ozonTask.id, taskId), eq(ozonTask.userId, userId)))
      .limit(1);

    return task;
  }

  /**
   * Get task with credential info
   */
  async getTaskWithCredential(taskId: string, userId: string) {
    const [task] = await db()
      .select({
        task: ozonTask,
        credential: {
          id: ozonCredential.id,
          name: ozonCredential.name,
        },
      })
      .from(ozonTask)
      .innerJoin(
        ozonCredential,
        eq(ozonTask.credentialId, ozonCredential.id)
      )
      .where(and(eq(ozonTask.id, taskId), eq(ozonTask.userId, userId)))
      .limit(1);

    return task;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    if (!task) {
      throw new Error('Task not found');
    }

    await db().delete(ozonTask).where(eq(ozonTask.id, taskId));
    return task;
  }

  /**
   * Get task statistics for user
   */
  async getUserTaskStats(userId: string) {
    const tasks = await this.getUserTasks(userId, { limit: 1000 });

    return {
      total: tasks.length,
      pending: tasks.filter((t: any) => t.status === 'pending').length,
      processing: tasks.filter((t: any) => t.status === 'processing').length,
      completed: tasks.filter((t: any) => t.status === 'completed').length,
      failed: tasks.filter((t: any) => t.status === 'failed').length,
      totalImages: tasks.reduce((sum: number, t: any) => sum + (t.successImages || 0), 0),
    };
  }
}

export const ozonDb = new OzonDb();
