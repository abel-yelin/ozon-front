import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { getFileNameFromUrl, getStemFromFilename, isMainStem } from '@/shared/lib/image-studio';

// GET /api/image-studio/folders
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const workflowStates = await aiPlaygroundDb.getUserWorkflowStates(user.id, { limit: 500 });
    const allPairs = await aiPlaygroundDb.getUserImagePairs(user.id, { limit: 10000 });
    const pairsByWorkflow = new Map<string, typeof allPairs>();

    for (const pair of allPairs) {
      const workflowId = pair.workflowStateId;
      if (!workflowId) continue;
      const list = pairsByWorkflow.get(workflowId) || [];
      list.push(pair);
      pairsByWorkflow.set(workflowId, list);
    }

    const folders = workflowStates.map((state) => {
      const pairs = pairsByWorkflow.get(state.id) || [];
      const inputStems = new Set<string>();
      const outputStems = new Set<string>();
      for (const pair of pairs) {
        const inputName = getFileNameFromUrl(pair.sourceUrl);
        const stem = getStemFromFilename(inputName);
        if (stem) inputStems.add(stem);
        if (pair.resultUrl) {
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

      return {
        sku: state.name,
        archived: state.state === 'archived',
        generated: outputStems.size > 0,
        status,
        review_status: reviewStatus,
        input_count: inputStems.size,
        output_count: outputStems.size,
        workflow_state_id: state.id,
      };
    });

    return respData({ folders });
  } catch (error) {
    console.error('Get ImageStudio folders error:', error);
    return respErr('Failed to load folders');
  }
}
