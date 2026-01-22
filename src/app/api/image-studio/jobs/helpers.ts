import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getImageStudioJobStatus } from '@/lib/api/image-studio-server';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const QUEUE_STATUS_MAP: Record<string, string> = {
  queued: 'pending',
  running: 'processing',
  success: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
};

function normalizeItems(result: any) {
  if (!result) return [];
  const items = Array.isArray(result.items) ? result.items : [];
  return items;
}

async function resolveWorkflowStateId(
  userId: string,
  sku: string,
  cfg: Record<string, any>,
  cache: Map<string, any>
) {
  if (!sku) return null;
  if (cfg.workflowStateIds && cfg.workflowStateIds[sku]) {
    return cfg.workflowStateIds[sku];
  }
  if (cfg.workflowStateId && cfg.sku === sku) {
    return cfg.workflowStateId;
  }
  if (cache.has(sku)) {
    return cache.get(sku).id;
  }
  let state = await aiPlaygroundDb.getWorkflowStateByName(userId, sku);
  if (!state) {
    state = await aiPlaygroundDb.createWorkflowState({
      userId,
      name: sku,
      state: 'pending',
      imagePairs: [],
      config: {},
    });
  }
  cache.set(sku, state);
  return state.id;
}

async function applyJobResult(userId: string, job: any, result: any) {
  const items = normalizeItems(result);
  if (!items.length) return [];

  const cfg = (job.config || {}) as Record<string, any>;
  const stateCache = new Map<string, any>();
  const pairsCache = new Map<string, Map<string, any>>();

  const ensurePairs = async (workflowStateId: string) => {
    if (pairsCache.has(workflowStateId)) {
      return pairsCache.get(workflowStateId)!;
    }
    const existingPairs = await aiPlaygroundDb.getUserImagePairs(userId, {
      workflowStateId,
      limit: 10000,
    });
    const map = new Map<string, any>(existingPairs.map((p: any) => [p.sourceUrl, p]));
    pairsCache.set(workflowStateId, map);
    return map;
  };

  const resultUrls: string[] = [];

  for (const item of items) {
    const sku = String(item.sku || cfg.sku || '').trim();
    const sourceUrl = item.source_url || item.sourceUrl;
    const resultUrl = item.result_url || item.resultUrl;
    if (!sku || !sourceUrl) continue;

    const workflowStateId = await resolveWorkflowStateId(userId, sku, cfg, stateCache);
    if (!workflowStateId) continue;

    const pairMap = await ensurePairs(workflowStateId);
    const existing = pairMap.get(sourceUrl);
    if (existing) {
      const updated = await aiPlaygroundDb.updateImagePair(existing.id, userId, {
        resultUrl: resultUrl || existing.resultUrl || null,
        metadata: item.metadata || existing.metadata || undefined,
      });
      pairMap.set(sourceUrl, updated);
    } else {
      const created = await aiPlaygroundDb.createImagePair({
        userId,
        workflowStateId,
        jobId: job.id,
        sourceUrl,
        resultUrl,
        metadata: item.metadata || undefined,
      });
      pairMap.set(sourceUrl, created);
    }

    if (resultUrl) {
      resultUrls.push(resultUrl);
    }
  }

  return resultUrls;
}

export function buildJobView(job: any) {
  const cfg = (job.config || {}) as Record<string, any>;
  return {
    id: job.id,
    mode: cfg.mode || job.type,
    sku: cfg.sku || '',
    stem: cfg.stem || null,
    status: job.status,
    cancel_requested: job.status === 'cancelled',
    created_at: job.createdAt,
    started_at: job.startedAt,
    finished_at: job.completedAt,
    error: job.errorMessage || null,
  };
}

export async function syncImageStudioJob(userId: string, job: any) {
  if (!job || TERMINAL_STATUSES.has(job.status)) {
    return job;
  }

  const remote = await getImageStudioJobStatus(job.id).catch(() => null);
  if (!remote) {
    return job;
  }

  const mappedStatus = QUEUE_STATUS_MAP[String(remote.status || '')] || job.status;

  if (mappedStatus === 'completed') {
    const resultUrls = await applyJobResult(userId, job, remote.result);
    const updated = await aiPlaygroundDb.updateJob(job.id, userId, {
      status: 'completed',
      progress: 100,
      resultImageUrls: resultUrls,
      completedAt: new Date(),
    });
    await aiPlaygroundDb.createJobLog({
      jobId: job.id,
      level: 'info',
      message: 'Job completed successfully.',
    });
    return updated || job;
  }

  if (mappedStatus === 'failed') {
    const updated = await aiPlaygroundDb.updateJob(job.id, userId, {
      status: 'failed',
      errorMessage: remote.error || job.errorMessage || 'Job failed',
      completedAt: new Date(),
    });
    await aiPlaygroundDb.createJobLog({
      jobId: job.id,
      level: 'error',
      message: remote.error || 'Job failed',
    });
    return updated || job;
  }

  if (mappedStatus === 'cancelled') {
    const updated = await aiPlaygroundDb.updateJob(job.id, userId, {
      status: 'cancelled',
      completedAt: new Date(),
    });
    return updated || job;
  }

  if (mappedStatus === 'processing' && job.status !== 'processing') {
    const updated = await aiPlaygroundDb.updateJob(job.id, userId, {
      status: 'processing',
      startedAt: job.startedAt || new Date(),
    });
    return updated || job;
  }

  if (mappedStatus === 'pending' && job.status !== 'pending') {
    const updated = await aiPlaygroundDb.updateJob(job.id, userId, {
      status: 'pending',
    });
    return updated || job;
  }

  return job;
}

export async function syncImageStudioJobs(userId: string, jobs: any[]) {
  if (!jobs.length) return jobs;
  const needsSync = jobs.filter((job) => !TERMINAL_STATUSES.has(job.status));
  if (!needsSync.length) return jobs;

  const synced = await Promise.all(
    jobs.map(async (job) => syncImageStudioJob(userId, job))
  );
  return synced;
}
