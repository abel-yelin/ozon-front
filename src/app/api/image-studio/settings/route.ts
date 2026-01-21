import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { aiPlaygroundDb } from '@/lib/db/ai-playground';
import { envConfigs } from '@/config';
import { guessTemplateLanguage } from '@/shared/lib/image-studio';

const DEFAULT_TITLE_DETAILS_PROMPT_CN =
  '要求：\n' +
  '1) 请根据标题与详情结合图片内容与图片上的文字，整体理解产品真实属性与款式。\n' +
  '2) 卖点/亮点必须谨慎：只能在图片文字/标题/详情明确支持时总结，禁止臆测与夸大。\n' +
  '3) 不确定的信息不要写，不要编造规格、材质、功能、品牌、认证、适配范围等。\n' +
  '4) 执行图生图任务时仍需严格保持现有文字不变，禁止增加图片文字、标题、详情之外的文字描述。\n' +
  '5) 根据标题与详情结合图片内容与图片上的文字，总结卖点亮点等主图需要的文字，并配合主图表达，按电商主图文案习惯均匀分布到几张主图中；尤其注意第一张主图文字要突出亮点卖点。';

const DEFAULT_STYLE_MAIN_PROMPT_CN = '主图风格统一，背景材质与光照一致，产品主体突出，稳重简洁。';

function toFloat(value: any) {
  const v = Number(value);
  return Number.isFinite(v) ? v : null;
}

function toInt(value: any) {
  const v = parseInt(String(value), 10);
  return Number.isFinite(v) ? v : null;
}

function buildSettingsResponse(payload: {
  prefs: any;
  group: any | null;
  groups: Array<{ id: string; name: string }>;
}) {
  const { prefs, group, groups } = payload;
  const templates = (group && group.prompt_templates) || {};
  const additional = (prefs?.additionalSettings || {}) as Record<string, any>;
  const activeGroupId = prefs?.activePromptGroupId || group?.id || '';
  const activeGroupName = group?.name || '';

  const defaultTemp = typeof prefs?.defaultTemperature === 'number'
    ? Math.max(0, Math.min(1, prefs.defaultTemperature / 100))
    : 0.5;

  return {
    api_base: additional.api_base || envConfigs.python_api_url || '',
    api_key: additional.api_key || '',
    model: additional.model || '',
    target_width: prefs?.targetWidth || 1500,
    target_height: prefs?.targetHeight || 2000,
    default_temperature: defaultTemp,
    resume_mode: Boolean(additional.resume_mode),
    continuous_view_enabled: Boolean(additional.continuous_view_enabled),
    show_final_prompt_text: Boolean(additional.show_final_prompt_text),
    prompt_groups: groups,
    active_prompt_group_id: activeGroupId,
    active_prompt_group_name: activeGroupName,
    use_english_prompts: Boolean(prefs?.useEnglish),
    prompt_common_cn: templates.common_cn || '',
    prompt_main_cn: templates.main_cn || '',
    prompt_secondary_cn: templates.secondary_cn || '',
    style_main_prompt_cn: templates.style_main_prompt_cn || DEFAULT_STYLE_MAIN_PROMPT_CN,
    style_extract_instruction_cn: templates.style_extract_instruction_cn || '',
    title_details_prompt_cn: templates.title_details_prompt_cn || DEFAULT_TITLE_DETAILS_PROMPT_CN,
    opt_remove_watermark_cn: templates.opt_remove_watermark_cn || '',
    opt_remove_logo_cn: templates.opt_remove_logo_cn || '',
    opt_text_edit_cn: templates.opt_text_edit_cn || '',
    opt_restructure_cn: templates.opt_restructure_cn || '',
    opt_recolor_cn: templates.opt_recolor_cn || '',
    opt_add_markers_cn: templates.opt_add_markers_cn || '',
    prompt_common_en: templates.common_en || '',
    prompt_main_en: templates.main_en || '',
    prompt_secondary_en: templates.secondary_en || '',
    style_main_prompt_en: templates.style_main_prompt_en || '',
    style_extract_instruction_en: templates.style_extract_instruction_en || '',
    opt_remove_watermark_en: templates.opt_remove_watermark_en || '',
    opt_remove_logo_en: templates.opt_remove_logo_en || '',
    opt_text_edit_en: templates.opt_text_edit_en || '',
    opt_restructure_en: templates.opt_restructure_en || '',
    opt_recolor_en: templates.opt_recolor_en || '',
    opt_add_markers_en: templates.opt_add_markers_en || '',
    title_details_prompt_en: templates.title_details_prompt_en || '',
    pro_plan_instruction_cn: additional.pro_plan_instruction_cn || '',
  };
}

async function resolveActiveGroup(userId: string, prefs: any) {
  const groups = await aiPlaygroundDb.getPromptGroups(userId);
  let activeGroupId = prefs?.activePromptGroupId || '';

  // Fallback to first group (including system default) if none set
  if (!activeGroupId && groups.length) {
    activeGroupId = groups[0].id;
    // Auto-set it for future requests
    await aiPlaygroundDb.updateUserPromptPreferences(userId, {
      activePromptGroupId: activeGroupId,
    });
  }

  let group = null;
  if (activeGroupId) {
    group = await aiPlaygroundDb.getPromptGroupWithTemplates(activeGroupId);
  }

  return { groups, group, activeGroupId };
}

// GET /api/image-studio/settings
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const prefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const { groups, group } = await resolveActiveGroup(user.id, prefs);

    return respData(buildSettingsResponse({ prefs, group, groups }));
  } catch (error) {
    console.error('Get ImageStudio settings error:', error);
    return respErr('Failed to load settings');
  }
}

// POST /api/image-studio/settings
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized, please sign in');
    }

    const body = await req.json();
    const prefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const additional = { ...(prefs.additionalSettings || {}) } as Record<string, any>;

    if ('api_base' in body) additional.api_base = String(body.api_base || '');
    if ('api_key' in body) additional.api_key = String(body.api_key || '');
    if ('model' in body) additional.model = String(body.model || '');
    if ('pro_plan_instruction_cn' in body) {
      additional.pro_plan_instruction_cn = String(body.pro_plan_instruction_cn || '');
    }
    if ('resume_mode' in body) additional.resume_mode = Boolean(body.resume_mode);
    if ('continuous_view_enabled' in body) {
      additional.continuous_view_enabled = Boolean(body.continuous_view_enabled);
    }
    if ('show_final_prompt_text' in body) {
      additional.show_final_prompt_text = Boolean(body.show_final_prompt_text);
    }

    const updates: Record<string, any> = { additionalSettings: additional };
    if ('use_english_prompts' in body) updates.useEnglish = Boolean(body.use_english_prompts);

    if ('default_temperature' in body) {
      const t = toFloat(body.default_temperature);
      if (t !== null) updates.defaultTemperature = Math.round(t * 100);
    }
    if ('target_width' in body) {
      const w = toInt(body.target_width);
      if (w !== null) updates.targetWidth = w;
    }
    if ('target_height' in body) {
      const h = toInt(body.target_height);
      if (h !== null) updates.targetHeight = h;
    }
    if ('image_format' in body) updates.imageFormat = String(body.image_format || '');
    if ('quality' in body) {
      const q = toInt(body.quality);
      if (q !== null) updates.quality = q;
    }
    if ('preserve_original' in body) updates.preserveOriginal = Boolean(body.preserve_original);

    await aiPlaygroundDb.updateUserPromptPreferences(user.id, updates);

    const { groups, group, activeGroupId } = await resolveActiveGroup(user.id, prefs);
    if (!group && body.prompt_common_cn) {
      const created = await aiPlaygroundDb.createPromptGroup({
        userId: user.id,
        name: '提示词一',
        templates: [{ key: 'common_cn', content: String(body.prompt_common_cn || '') }],
      });
      await aiPlaygroundDb.updateUserPromptPreferences(user.id, {
        activePromptGroupId: created.id,
        additionalSettings: additional,
      });
    }

    const promptKeyMap: Record<string, string> = {
      prompt_common_cn: 'common_cn',
      prompt_main_cn: 'main_cn',
      prompt_secondary_cn: 'secondary_cn',
      style_main_prompt_cn: 'style_main_prompt_cn',
      style_extract_instruction_cn: 'style_extract_instruction_cn',
      title_details_prompt_cn: 'title_details_prompt_cn',
      opt_remove_watermark_cn: 'opt_remove_watermark_cn',
      opt_remove_logo_cn: 'opt_remove_logo_cn',
      opt_text_edit_cn: 'opt_text_edit_cn',
      opt_restructure_cn: 'opt_restructure_cn',
      opt_recolor_cn: 'opt_recolor_cn',
      opt_add_markers_cn: 'opt_add_markers_cn',
      prompt_common_en: 'common_en',
      prompt_main_en: 'main_en',
      prompt_secondary_en: 'secondary_en',
      style_main_prompt_en: 'style_main_prompt_en',
      style_extract_instruction_en: 'style_extract_instruction_en',
      title_details_prompt_en: 'title_details_prompt_en',
      opt_remove_watermark_en: 'opt_remove_watermark_en',
      opt_remove_logo_en: 'opt_remove_logo_en',
      opt_text_edit_en: 'opt_text_edit_en',
      opt_restructure_en: 'opt_restructure_en',
      opt_recolor_en: 'opt_recolor_en',
      opt_add_markers_en: 'opt_add_markers_en',
    };

    let promptUpdates = 0;
    const latestPrefs = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const { group: activeGroup } = await resolveActiveGroup(user.id, latestPrefs);
    if (activeGroup) {
      const templates = { ...(activeGroup.prompt_templates || {}) } as Record<string, string>;
      for (const [bodyKey, templateKey] of Object.entries(promptKeyMap)) {
        if (!(bodyKey in body)) continue;
        templates[templateKey] = String(body[bodyKey] || '');
        promptUpdates += 1;
      }

      if (promptUpdates > 0) {
        const templateList = Object.entries(templates).map(([key, content]) => ({
          key,
          content,
          language: guessTemplateLanguage(key),
        }));
        await aiPlaygroundDb.updatePromptGroupWithTemplates(activeGroupId || activeGroup.id, {
          templates: templateList,
        });
      }
    }

    const refreshed = await aiPlaygroundDb.getUserPromptPreferences(user.id);
    const { groups: refreshedGroups, group: refreshedGroup } = await resolveActiveGroup(user.id, refreshed);
    return respData(buildSettingsResponse({ prefs: refreshed, group: refreshedGroup, groups: refreshedGroups }));
  } catch (error) {
    console.error('Update ImageStudio settings error:', error);
    return respErr('Failed to update settings');
  }
}
