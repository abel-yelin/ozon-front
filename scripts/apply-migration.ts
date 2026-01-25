/**
 * 手动执行数据库迁移
 * 绕过 drizzle-kit 的 bug
 */

import { db } from '../src/core/db';
import { sql } from 'drizzle-orm';

async function applyMigration() {
  console.log('🔄 开始执行数据库迁移...\n');

  try {
    // 检查 credit_id 字段是否已存在
    console.log('1. 检查 credit_id 字段是否存在...');
    const checkResult = await db().execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ai_job'
        AND column_name = 'credit_id'
    `);

    // @ts-ignore - 处理不同的返回格式
    const rows = checkResult?.rows || checkResult || [];

    if (rows.length > 0) {
      console.log('   ✓ credit_id 字段已存在，跳过迁移\n');
      console.log('✅ 数据库已是最新状态！\n');
      return;
    }

    console.log('   ✓ 字段不存在，开始迁移...\n');

    // 添加 credit_id 字段
    console.log('2. 添加 credit_id 字段到 ai_job 表...');
    await db().execute(sql`
      ALTER TABLE "ai_job"
      ADD COLUMN "credit_id" text
    `);
    console.log('   ✓ 字段添加成功\n');

    // 创建索引
    console.log('3. 创建索引 idx_ai_job_credit...');
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_ai_job_credit"
      ON "ai_job" ("credit_id")
    `);
    console.log('   ✓ 索引创建成功\n');

    // 验证
    console.log('4. 验证修改...');
    const verifyResult = await db().execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ai_job'
        AND column_name = 'credit_id'
    `);

    // @ts-ignore
    const columns = verifyResult?.rows || verifyResult || [];

    console.log('   ✓ 验证成功：');
    console.log('   ', columns);

    console.log('\n✅ 迁移完成！数据库已更新。\n');

  } catch (error: any) {
    console.error('\n❌ 迁移失败：', error.message);
    console.error('详细错误：', error);
    process.exit(1);
  }
}

applyMigration();

