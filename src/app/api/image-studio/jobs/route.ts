import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { submitImageStudioJob } from '@/lib/api/image-studio-server';
import { getUserGalleryImages } from '@/shared/services/gallery';
import { getFileNameFromUrl, getStemFromFilename } from '@/shared/lib/image-studio';
import { buildJobView, syncImageStudioJobs } from '@/app/api/image-studio/jobs/helpers';

/**
 * Credit cost for different ImageStudio operations
 */
const IMAGE_STUDIO_CREDIT_COSTS = {
  single_regenerate: 1, // 单张图片重新生成
  batch_generate: 5, // 批量生成(按SKU)
} as const;

// ========================================
// Prompt Validation
// ========================================

interface PromptValidationResult {
  valid: boolean;
  error?: string;
  group?: any;
}

/**
 * Validate that user has a valid prompt group with required templates
 * Called before creating any image generation job
 */
async function validatePromptForJob(
  userId: string
): Promise<PromptValidationResult> {
  const prefs = await aiPlaygroundDb.getUserPromptPreferences(userId);
  const activeId = prefs?.activePromptGroupId;

  // Check 1: Active group is set
  if (!activeId) {
    return {
      valid: false,
      error: '未设置提示词组，请在设置中选择或创建提示词组',
    };
  }

  // Check 2: Group exists and has templates
  const group = await aiPlaygroundDb.getPromptGroupWithTemplates(activeId);
  if (!group) {
    return {
      valid: false,
      error: '选中的提示词组不存在，请重新选择',
    };
  }

  // Check 3: Has at least one common template (required for generation)
  const templates = group.prompt_templates || {};
  const hasCommon = templates.common_cn || templates.common_en;

  if (!hasCommon) {
    return {
      valid: false,
      error: '提示词组缺少必需模板（common_cn 或 common_en），请在设置中配置',
    };
  }

  return { valid: true, group };
}

// GET /api/image-studio/jobs
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const jobs = await aiPlaygroundDb.getUserJobs(user.id, {
      limit,
      type: 'image_studio',
    });

    console.log('[ImageStudio] GET jobs', {
      totalJobs: jobs.length,
      jobIds: jobs.map((j: any) => ({ id: j.id, status: j.status })),
    });

    const syncedJobs = await syncImageStudioJobs(user.id, jobs);

    console.log('[ImageStudio] GET jobs after sync', {
      totalJobs: syncedJobs.length,
      jobIds: syncedJobs.map((j: any) => ({
        id: j.id,
        status: j.status,
        resultImageUrlsCount: (j.resultImageUrls || []).length,
      })),
    });

    const jobViews = syncedJobs.map(buildJobView);
    const runningJobs = jobViews.filter((j) => j.status === 'processing');
    const running = runningJobs.length ? runningJobs[0] : null;
    const queuedCount = jobViews.filter((j) => j.status === 'pending').length;

    return respData({
      running,
      running_jobs: runningJobs,
      queued_count: queuedCount,
      jobs: jobViews,
    });
  } catch (error) {
    console.error('Get ImageStudio jobs error:', error);
    return respErr('Failed to load jobs');
  }
}

// POST /api/image-studio/jobs
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const mode = String(body?.mode || '').trim();
    const sku = String(body?.sku || '').trim();
    const stem = body?.stem ? String(body.stem).trim() : '';
    const rawOptions = body?.options || {};

    console.info('[ImageStudio] Create job request', { mode, sku, stem });

    if (!mode || !sku) {
      return respErr('mode/sku required');
    }

    // NEW: Validate prompt configuration before processing
    const validation = await validatePromptForJob(user.id);
    if (!validation.valid) {
      return respErr(validation.error || 'Prompt validation failed');
    }

    console.info('[ImageStudio] Prompt validation passed', {
      groupId: validation.group?.id,
      groupName: validation.group?.name,
    });

    const [prefs, promptGroups, galleryImages] = await Promise.all([
      aiPlaygroundDb.getUserPromptPreferences(user.id),
      aiPlaygroundDb.getPromptGroups(user.id),
      getUserGalleryImages(user.id, { limit: 500 }),
    ]);

    const activeGroupId = prefs?.activePromptGroupId || promptGroups?.[0]?.id || '';
    const activeGroup = activeGroupId
      ? await aiPlaygroundDb.getPromptGroupWithTemplates(activeGroupId)
      : null;

    const additional = (prefs?.additionalSettings || {}) as Record<string, any>;
    const { settings: clientSettings, ...options } = rawOptions;
    const size = typeof clientSettings?.imageSize === 'string' ? clientSettings.imageSize : '';
    const [sizeW, sizeH] = size.split('x').map((value: string) => parseInt(value, 10));

    const targetWidth = Number.isFinite(sizeW) ? sizeW : prefs?.targetWidth || 1500;
    const targetHeight = Number.isFinite(sizeH) ? sizeH : prefs?.targetHeight || 2000;
    const outputFormat = clientSettings?.imageFormat || prefs?.imageFormat || options.output_format || 'png';
    const defaultTemperature = typeof prefs?.defaultTemperature === 'number'
      ? Math.max(0, Math.min(1, prefs.defaultTemperature / 100))
      : 0.5;

    const baseOptions = {
      api_key: additional.api_key || '',
      api_base: additional.api_base || '',
      model: additional.model || '',
      target_width: targetWidth,
      target_height: targetHeight,
      default_temperature: defaultTemperature,
      output_format: outputFormat,
      use_english: Boolean(prefs?.useEnglish),
      prompt_templates: activeGroup?.prompt_templates || {},
    };

    const templateKeys = Object.keys(baseOptions.prompt_templates || {});
    console.info('[ImageStudio] Prompt templates loaded', {
      groupId: activeGroup?.id || activeGroupId,
      templateCount: templateKeys.length,
      useEnglish: baseOptions.use_english,
    });

    const jobOptions = { ...options, ...baseOptions };
    const isBatchMode = mode.startsWith('batch_');
    const isFolderMode = mode === 'folder_generate';
    const isSingleMode = ['image_regenerate', 'image_optimize_current', 'image_custom_generate'].includes(mode);

    // ========================================
    // Credit Check & Consumption
    // ========================================

    // Calculate credit cost based on mode
    let creditCost = 0;
    if (isSingleMode) {
      creditCost = IMAGE_STUDIO_CREDIT_COSTS.single_regenerate;
    } else if (isBatchMode) {
      const skuCount = Array.isArray(options.skus) ? options.skus.length : 1;
      creditCost = IMAGE_STUDIO_CREDIT_COSTS.batch_generate * skuCount;
    }

    console.info('[ImageStudio] Credit check', {
      mode,
      creditCost,
      isSingleMode,
      isBatchMode,
      skuCount: isBatchMode ? (Array.isArray(options.skus) ? options.skus.length : 1) : 0,
    });

    // Check if user has enough credits
    if (creditCost > 0) {
      const remainingCredits = await getRemainingCredits(user.id);
      console.info('[ImageStudio] User credit balance', {
        userId: user.id,
        remainingCredits,
        required: creditCost,
      });

      if (remainingCredits < creditCost) {
        console.warn('[ImageStudio] Insufficient credits', {
          remainingCredits,
          required: creditCost,
        });
        return respErr(
          `积分不足。需要 ${creditCost} 积分，当前余额 ${remainingCredits} 积分。请前往充值页面购买更多积分。`
        );
      }
    }

    const galleryBySku = new Map<string, typeof galleryImages>();
    for (const image of galleryImages) {
      const list = galleryBySku.get(image.article) || [];
      list.push(image);
      galleryBySku.set(image.article, list);
    }

    const buildSourceImages = (images: typeof galleryImages) =>
      images
        .map((image) => {
          const name = getFileNameFromUrl(image.url);
          const stemValue = getStemFromFilename(name);
          return {
            url: image.url,
            name,
            stem: stemValue,
          };
        })
        .filter((item) => item.url);

    let resolvedStem = stem;
    let sourceUrl = String(options.source_url || '');
    let sourceImageUrls: string[] = [];
    let workflowStateId: string | null = null;
    let workflowStateIds: Record<string, string> | null = null;

    if (isBatchMode) {
      const skus = Array.isArray(options.skus)
        ? options.skus.map((value: any) => String(value).trim()).filter(Boolean)
        : [];
      const skuList = skus.length ? skus : (sku && sku !== '__batch__' ? [sku] : []);
      if (!skuList.length) {
        return respErr('skus required');
      }

      console.info('[ImageStudio] Batch mode', { skuList, skuCount: skuList.length });

      const workflowStates = await aiPlaygroundDb.getUserWorkflowStates(user.id, { limit: 500 });
      const stateByName = new Map<string, any>(workflowStates.map((state: any) => [state.name, state]));
      workflowStateIds = {};

      const skuImagesMap: Record<string, any[]> = {};
      for (const skuName of skuList) {
        const sources = buildSourceImages(galleryBySku.get(skuName) || []);
        console.info(`[ImageStudio] SKU ${skuName}: ${sources.length} images found`);

        if (sources.length) {
          skuImagesMap[skuName] = sources;
          sourceImageUrls.push(...sources.map((item) => item.url));
        }

        let state = stateByName.get(skuName);
        if (!state) {
          state = await aiPlaygroundDb.createWorkflowState({
            userId: user.id,
            name: skuName,
            state: 'pending',
            imagePairs: [],
            config: {},
          });
        }
        workflowStateIds[skuName] = state.id;
      }

      if (sourceImageUrls.length === 0) {
        console.error('[ImageStudio] No source images found for batch SKUs', { skuList });
        return respErr('所选SKU没有找到可用的图片，请先在Gallery中上传图片');
      }

      console.info('[ImageStudio] Batch images collected', {
        skuCount: skuList.length,
        totalImages: sourceImageUrls.length
      });

      jobOptions.sku_images_map = skuImagesMap;
      jobOptions.skus = skuList;
    } else if (isFolderMode) {
      const sources = buildSourceImages(galleryBySku.get(sku) || []);
      jobOptions.source_images = sources;
      sourceImageUrls = sources.map((item) => item.url);
    } else if (isSingleMode) {
      if (!sourceUrl && stem) {
        const pair = await aiPlaygroundDb.getImagePair(stem, user.id);
        if (pair?.sourceUrl) {
          sourceUrl = pair.sourceUrl;
          if (mode === 'image_optimize_current' && pair.resultUrl) {
            sourceUrl = pair.resultUrl;
          }
        }
      }

      if (!sourceUrl) {
        const sources = buildSourceImages(galleryBySku.get(sku) || []);
        const match = sources.find((item) => item.stem === stem || item.name === stem);
        sourceUrl = match?.url || '';
      }

      if (!sourceUrl) {
        return respErr('source_url required');
      }

      const derivedStem = getStemFromFilename(getFileNameFromUrl(sourceUrl));
      resolvedStem = derivedStem || resolvedStem;
      jobOptions.source_url = sourceUrl;
      sourceImageUrls = [sourceUrl];
    }

    if (!isBatchMode) {
      let state = await aiPlaygroundDb.getWorkflowStateByName(user.id, sku);
      if (!state) {
        state = await aiPlaygroundDb.createWorkflowState({
          userId: user.id,
          name: sku,
          state: 'pending',
          imagePairs: [],
          config: { mode },
        });
      }
      workflowStateId = state.id;
    }

    const jobConfig: Record<string, any> = {
      mode,
      sku,
      stem: resolvedStem || null,
      options: jobOptions,
      // NEW: Include prompt_group_id for tracing/debugging
      prompt_group_id: validation.group?.id || '',
    };
    if (workflowStateId) {
      jobConfig.workflowStateId = workflowStateId;
    }
    if (workflowStateIds) {
      jobConfig.workflowStateIds = workflowStateIds;
    }

    const job = await aiPlaygroundDb.createJob({
      userId: user.id,
      type: 'image_studio',
      config: jobConfig,
      sourceImageUrls,
    });

    console.info('[ImageStudio] Job created in DB', {
      jobId: job.id,
      mode,
      sku,
      sourceImageCount: sourceImageUrls.length,
      hasPromptGroup: !!jobConfig.prompt_group_id,
    });

    // ========================================
    // Consume Credits
    // ========================================

    let consumedCreditId: string | undefined;
    if (creditCost > 0) {
      try {
        console.info('[ImageStudio] Consuming credits', {
          jobId: job.id,
          userId: user.id,
          creditCost,
        });

        const consumedCredit = await consumeCredits({
          userId: user.id,
          credits: creditCost,
          scene: 'image_studio',
          description: `ImageStudio ${mode} - ${sku}`,
          metadata: JSON.stringify({
            type: 'image-studio',
            mode: mode,
            sku: sku,
            stem: resolvedStem || null,
            jobId: job.id,
          }),
        });

        consumedCreditId = consumedCredit?.id;

        console.info('[ImageStudio] Credits consumed successfully', {
          creditId: consumedCreditId,
          creditCost,
        });

        // Update job record with credit ID
        await aiPlaygroundDb.updateJob(job.id, user.id, {
          creditId: consumedCreditId,
        });
      } catch (error) {
        console.error('[ImageStudio] Failed to consume credits', error);

        // Clean up job if credit consumption failed
        await aiPlaygroundDb.updateJob(job.id, user.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Failed to consume credits',
          completedAt: new Date(),
        });

        return respErr(error instanceof Error ? error.message : 'Failed to consume credits');
      }
    }

    let response: any;
    try {
      const payload = {
        job_id: job.id,
        user_id: user.id,
        mode,
        sku,
        stem: resolvedStem || null,
        options: jobOptions,
      };

      // Log payload size for debugging
      const payloadSize = JSON.stringify(payload).length;

      // Log detailed payload structure
      const skuImagesMapKeys = Object.keys(jobOptions.sku_images_map || {});
      const sampleSkuImages = skuImagesMapKeys.length > 0
        ? { [skuImagesMapKeys[0]]: (jobOptions.sku_images_map[skuImagesMapKeys[0]] || []).length }
        : {};

      console.info('[ImageStudio] Submitting to FastAPI', {
        jobId: job.id,
        mode,
        payloadSizeBytes: payloadSize,
        hasSkuImagesMap: !!jobOptions.sku_images_map,
        skuImagesMapKeys,
        sampleSkuImages,
        skuCount: jobOptions.skus?.length || 0,
        totalSourceImages: sourceImageUrls.length,
      });

      response = await submitImageStudioJob(payload);

      console.info('[ImageStudio] FastAPI response received', {
        jobId: job.id,
        hasResponse: !!response,
        success: response?.success,
      });
    } catch (error) {
      console.error('Submit ImageStudio job error:', error);
      await aiPlaygroundDb.updateJob(job.id, user.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Job submission failed',
        completedAt: new Date(),
      });
      await aiPlaygroundDb.createJobLog({
        jobId: job.id,
        level: 'error',
        message: error instanceof Error ? error.message : 'Job submission failed',
      });
      return respErr(error instanceof Error ? error.message : 'Job submission failed');
    }

    if (!response || response.success === false) {
      const errorMsg = response?.error || 'Unknown error';
      console.error('[ImageStudio] FastAPI submit failed', {
        response,
        errorMsg,
        fullResponse: JSON.stringify(response, null, 2),
      });
      await aiPlaygroundDb.updateJob(job.id, user.id, {
        status: 'failed',
        errorMessage: errorMsg,
        completedAt: new Date(),
      });
      await aiPlaygroundDb.createJobLog({
        jobId: job.id,
        level: 'error',
        message: errorMsg,
        metadata: { response },
      });
      return respErr(errorMsg);
    }

    console.info('[ImageStudio] Job submitted successfully', {
      jobId: job.id,
      mode,
      sku,
      hasResponseData: !!response?.data,
    });

    console.info('[ImageStudio] Job queued', { jobId: job.id, mode, sku });
    await aiPlaygroundDb.createJobLog({
      jobId: job.id,
      level: 'info',
      message: 'Job queued.',
    });

    return respData({ job_id: job.id });
  } catch (error) {
    console.error('Create ImageStudio job error:', error);
    return respErr('Failed to create job');
  }
}
