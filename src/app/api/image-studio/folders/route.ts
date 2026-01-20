import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getFileNameFromUrl, getStemFromFilename, isMainStem } from '@/shared/lib/image-studio';
import { getUserGalleryImages } from '@/shared/services/gallery';

// GET /api/image-studio/folders
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const workflowStates = await aiPlaygroundDb.getUserWorkflowStates(user.id, { limit: 500 });
    const stateByName = new Map(workflowStates.map((s) => [s.name, s]));
    const allPairs = await aiPlaygroundDb.getUserImagePairs(user.id, { limit: 10000 });
    const pairBySource = new Map(allPairs.map((p) => [p.sourceUrl, p]));
    const galleryImages = await getUserGalleryImages(user.id, { limit: 500 });

    const grouped = new Map<string, typeof galleryImages>();
    for (const image of galleryImages) {
      const list = grouped.get(image.article) || [];
      list.push(image);
      grouped.set(image.article, list);
    }

    const folders = [];
    for (const [article, images] of grouped.entries()) {
      let state = stateByName.get(article);
      if (!state) {
        state = await aiPlaygroundDb.createWorkflowState({
          userId: user.id,
          name: article,
          state: 'pending',
          imagePairs: [],
          config: {},
        });
        stateByName.set(article, state);
      }

      const inputStems = new Set<string>();
      const outputStems = new Set<string>();
      let thumbnailUrl = "";
      let hasMain = false;

      for (const image of images) {
        const inputName = getFileNameFromUrl(image.url);
        const stem = getStemFromFilename(inputName);
        if (stem) inputStems.add(stem);
        if (!thumbnailUrl && image.url) {
          thumbnailUrl = image.url;
        }
        if (stem && isMainStem(stem)) {
          hasMain = true;
        }
        const pair = pairBySource.get(image.url);
        if (pair?.resultUrl) {
          const outputName = getFileNameFromUrl(pair.resultUrl);
          const outputStem = getStemFromFilename(outputName) || stem;
          if (outputStem) outputStems.add(outputStem);
        }
      }

      let status: 'not_generated' | 'main_generated' | 'done' = 'not_generated';
      if (outputStems.size > 0) {
        const done = inputStems.size > 0 && [...inputStems].every((s) => outputStems.has(s));
        if (done) {
          status = 'done';
        } else {
          const mainInputs = [...inputStems].filter((s) => isMainStem(s));
          const mainGenerated = mainInputs.length > 0 && mainInputs.some((s) => outputStems.has(s));
          status = mainGenerated ? 'main_generated' : 'not_generated';
        }
      }

      const reviewStatus = state.state === 'approved' ? 'approved' : 'pending';

      folders.push({
        sku: article,
        archived: state.state === 'archived',
        generated: outputStems.size > 0,
        status,
        review_status: reviewStatus,
        input_count: inputStems.size,
        output_count: outputStems.size,
        workflow_state_id: state.id,
        thumbnail_url: thumbnailUrl || null,
        has_main: hasMain,
      });
    }

    return respData({ folders });
  } catch (error) {
    console.error('Get ImageStudio folders error:', error);
    return respErr('Failed to load folders');
  }
}
