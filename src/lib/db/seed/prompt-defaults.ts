// src/lib/db/seed/prompt-defaults.ts

/**
 * Default prompt templates ported from dev/ozon-backen/demo2/web_server.py
 * These are used to seed the system default prompt group.
 */

export const DEFAULT_TITLE_DETAILS_PROMPT_CN =
  '要求：\n' +
  '1) 请根据标题与详情结合图片内容与图片上的文字，整体理解产品真实属性与款式。\n' +
  '2) 卖点/亮点必须谨慎：只能在图片文字/标题/详情明确支持时总结，禁止臆测与夸大。\n' +
  '3) 不确定的信息不要写，不要编造规格、材质、功能、品牌、认证、适配范围等。\n' +
  '4) 执行图生图任务时仍需严格保持现有文字不变，禁止增加图片文字、标题、详情之外的文字描述。\n' +
  '5) 根据标题与详情结合图片内容与图片上的文字，总结卖点亮点等主图需要的文字，并配合主图表达，按电商主图文案习惯均匀分布到几张主图中；尤其注意第一张主图文字要突出亮点卖点。';

export const DEFAULT_STYLE_MAIN_PROMPT_CN = '主图风格统一，背景材质与光照一致，产品主体突出，稳重简洁。';

/**
 * All 21 template keys from demo2 GROUP_PROMPT_KEYS
 */
export const GROUP_PROMPT_KEYS = [
  // Chinese templates
  'common_cn',
  'main_cn',
  'secondary_cn',
  'style_main_prompt_cn',
  'title_details_prompt_cn',
  'opt_remove_watermark_cn',
  'opt_remove_logo_cn',
  'opt_text_edit_cn',
  'opt_restructure_cn',
  'opt_recolor_cn',
  'opt_add_markers_cn',
  // English templates
  'common_en',
  'main_en',
  'secondary_en',
  'style_main_prompt_en',
  'title_details_prompt_en',
  'opt_remove_watermark_en',
  'opt_remove_logo_en',
  'opt_text_edit_en',
  'opt_restructure_en',
  'opt_recolor_en',
  'opt_add_markers_en',
] as const;

/**
 * Default system prompt templates
 * Only the Chinese templates have default content; English templates start empty.
 */
export const DEFAULT_SYSTEM_TEMPLATES: Record<string, string> = {
  title_details_prompt_cn: DEFAULT_TITLE_DETAILS_PROMPT_CN,
  style_main_prompt_cn: DEFAULT_STYLE_MAIN_PROMPT_CN,
  // All other keys default to empty string
  ...Object.fromEntries(
    GROUP_PROMPT_KEYS.filter(k => k !== 'title_details_prompt_cn' && k !== 'style_main_prompt_cn')
      .map(k => [k, ''])
  ),
};

/**
 * System default prompt group configuration
 */
export const SYSTEM_DEFAULT_GROUP_CONFIG = {
  id: 'system-default-cn',
  name: '系统默认提示词',
  description: '系统内置默认提示词组，包含常用的中文提示词模板',
  isSystemDefault: true,
};
