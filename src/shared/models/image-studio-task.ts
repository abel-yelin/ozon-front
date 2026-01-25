import { and, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit, imageStudioJob } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import { appendUserToResult, User } from '@/shared/models/user';

import { consumeCredits, CreditStatus } from './credit';

export type ImageStudioTask = typeof imageStudioJob.$inferSelect & {
  user?: User;
};
export type NewImageStudioTask = typeof imageStudioJob.$inferInsert;
export type UpdateImageStudioTask = Partial<Omit<NewImageStudioTask, 'id' | 'createdAt'>>;

/**
 * Cost credits for different ImageStudio operations
 */
export const IMAGE_STUDIO_CREDIT_COSTS = {
  single_regenerate: 1, // 单张图片重新生成
  batch_generate: 5, // 批量生成(按SKU)
} as const;

/**
 * Create an ImageStudio task and consume credits
 * This is called when user regenerates a single image
 */
export async function createImageStudioTask(newTask: NewImageStudioTask) {
  const result = await db().transaction(async (tx: any) => {
    // 1. Create task record
    const [taskResult] = await tx.insert(imageStudioJob).values(newTask).returning();

    // 2. Consume credits if costCredits is set
    if (newTask.costCredits && newTask.costCredits > 0) {
      const consumedCredit = await consumeCredits({
        userId: newTask.userId,
        credits: newTask.costCredits,
        scene: 'image_studio',
        description: `ImageStudio ${newTask.mode}`,
        metadata: JSON.stringify({
          type: 'image-studio',
          mode: newTask.mode,
          sku: newTask.sku,
          taskId: taskResult.id,
        }),
        tx,
      });

      // 3. Update task record with consumed credit id
      if (consumedCredit && consumedCredit.id) {
        taskResult.creditId = consumedCredit.id;
        await tx
          .update(imageStudioJob)
          .set({ creditId: consumedCredit.id })
          .where(eq(imageStudioJob.id, taskResult.id));
      }
    }

    return taskResult;
  });

  return result;
}

/**
 * Find ImageStudio task by ID
 */
export async function findImageStudioTaskById(id: string) {
  const [result] = await db().select().from(imageStudioJob).where(eq(imageStudioJob.id, id));
  return result;
}

/**
 * Update ImageStudio task
 * If task fails, credits will be refunded
 */
export async function updateImageStudioTask(id: string, updateTask: UpdateImageStudioTask) {
  const result = await db().transaction(async (tx: any) => {
    // Task failed - Refund credits
    if (updateTask.status === AITaskStatus.FAILED && updateTask.creditId) {
      // Get consumed credit record
      const [consumedCredit] = await tx
        .select()
        .from(credit)
        .where(eq(credit.id, updateTask.creditId));

      if (consumedCredit && consumedCredit.status === CreditStatus.ACTIVE) {
        const consumedItems = JSON.parse(consumedCredit.consumedDetail || '[]');

        console.log('[ImageStudio] Refunding credits', {
          creditId: updateTask.creditId,
          consumedItems: consumedItems.length,
        });

        // Add back consumed credits
        await Promise.all(
          consumedItems.map((item: any) => {
            if (item && item.creditId && item.creditsConsumed > 0) {
              return tx
                .update(credit)
                .set({
                  remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
                })
                .where(eq(credit.id, item.creditId));
            }
          })
        );

        // Delete consumed credit record
        await tx
          .update(credit)
          .set({
            status: CreditStatus.DELETED,
          })
          .where(eq(credit.id, updateTask.creditId));
      }
    }

    // Update task
    const [result] = await tx
      .update(imageStudioJob)
      .set(updateTask)
      .where(eq(imageStudioJob.id, id))
      .returning();

    return result;
  });

  return result;
}

/**
 * Get ImageStudio tasks count
 */
export async function getImageStudioTasksCount({
  userId,
  status,
  mode,
}: {
  userId?: string;
  status?: string;
  mode?: string;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(imageStudioJob)
    .where(
      and(
        userId ? eq(imageStudioJob.userId, userId) : undefined,
        status ? eq(imageStudioJob.status, status) : undefined,
        mode ? eq(imageStudioJob.mode, mode) : undefined
      )
    );

  return result?.count || 0;
}

/**
 * Get ImageStudio tasks
 */
export async function getImageStudioTasks({
  userId,
  status,
  mode,
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  status?: string;
  mode?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<ImageStudioTask[]> {
  const result = await db()
    .select()
    .from(imageStudioJob)
    .where(
      and(
        userId ? eq(imageStudioJob.userId, userId) : undefined,
        status ? eq(imageStudioJob.status, status) : undefined,
        mode ? eq(imageStudioJob.mode, mode) : undefined
      )
    )
    .orderBy(desc(imageStudioJob.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}
