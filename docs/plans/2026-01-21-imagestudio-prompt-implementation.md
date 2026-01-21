# ImageStudio Prompt Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add system default prompt group seeding, consolidate API responses to eliminate waterfall, add prompt group selector UI, and implement dual-layer validation.

**Architecture:**
1. Database layer seeds system default prompt group with 21 template keys from demo2
2. Next.js API consolidates settings + prompt groups into single response
3. Frontend adds prompt group selector to TopBar and removes waterfall requests
4. FastAPI validates prompts before AI calls as safety net

**Tech Stack:** Next.js 15, TypeScript, PostgreSQL, Drizzle ORM, shadcn/ui

---

## Prerequisites

**Reference Documents:**
- `docs/plans/2026-01-21-imagestudio-prompt-management-upgrade.md` - Design document
- `dev/ozon-backen/demo2/web_server.py` - Reference implementation

**Key Files to Understand Before Starting:**
- `src/lib/db/ai-playground.ts` - Database operations for prompts
- `src/app/api/image-studio/settings/route.ts` - Settings API endpoint
- `src/app/api/image-studio/jobs/route.ts` - Jobs API endpoint
- `src/shared/contexts/image-studio.tsx` - Frontend context
- `src/shared/blocks/image-studio/components/TopBar.tsx` - TopBar UI component

**Template Keys (21 total from demo2):**
```javascript
const GROUP_PROMPT_KEYS = [
  // Chinese (11)
  'common_cn', 'main_cn', 'secondary_cn', 'style_main_prompt_cn',
  'title_details_prompt_cn', 'opt_remove_watermark_cn', 'opt_remove_logo_cn',
  'opt_text_edit_cn', 'opt_restructure_cn', 'opt_recolor_cn', 'opt_add_markers_cn',
  // English (10)
  'common_en', 'main_en', 'secondary_en', 'style_main_prompt_en',
  'title_details_prompt_en', 'opt_remove_watermark_en', 'opt_remove_logo_en',
  'opt_text_edit_en', 'opt_restructure_en', 'opt_recolor_en', 'opt_add_markers_en',
];
```

---

## Phase 1: Database Foundation

### Task 1.1: Create Default Prompt Templates Constant

**Files:**
- Create: `src/lib/db/seed/prompt-defaults.ts`

**Step 1: Create the file with default template constants**

```typescript
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
```

**Step 2: Run TypeScript compiler to check**

Run: `npx tsc --noEmit src/lib/db/seed/prompt-defaults.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/db/seed/prompt-defaults.ts
git commit -m "feat(image-studio): add default prompt template constants from demo2"
```

---

### Task 1.2: Add ensureSystemDefaultPromptGroup Method

**Files:**
- Modify: `src/lib/db/ai-playground.ts` (add method after line 725)

**Step 1: Add the method to AiPlaygroundDb class**

Find the `// ========================================` section after `// Statistics Operations` (around line 725) and add:

```typescript
// src/lib/db/ai-playground.ts

// In AiPlaygroundDb class, after getUserImageStats() method, add:

// ========================================
// System Default Prompt Group
// ========================================

/**
 * Ensure system default prompt group exists
 * Creates it if missing, does nothing if already exists
 * Call this on app startup or when getting user preferences
 */
async ensureSystemDefaultPromptGroup() {
  // Check if system default already exists
  const existing = await db()
    .select()
    .from(aiPromptGroup)
    .where(eq(aiPromptGroup.isSystemDefault, true))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Import defaults
  const { SYSTEM_DEFAULT_GROUP_CONFIG, DEFAULT_SYSTEM_TEMPLATES, GROUP_PROMPT_KEYS } = await import('@/lib/db/seed/prompt-defaults');

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
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/db/ai-playground.ts
git commit -m "feat(image-studio): add ensureSystemDefaultPromptGroup method"
```

---

### Task 1.3: Call ensureSystemDefaultPromptGroup in getUserPromptPreferences

**Files:**
- Modify: `src/lib/db/ai-playground.ts:955-978`

**Step 1: Modify getUserPromptPreferences to ensure system default**

Find the `getUserPromptPreferences` method (around line 955) and modify:

```typescript
// src/lib/db/ai-playground.ts

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
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test manually via Node script**

Create temporary test file `test-seed.js`:

```javascript
const { aiPlaygroundDb } = require('./src/lib/db/ai-playground.ts');

async function test() {
  await aiPlaygroundDb.ensureSystemDefaultPromptGroup();
  const groups = await aiPlaygroundDb.getPromptGroups();
  const systemDefault = groups.find(g => g.isSystemDefault);
  console.log('System default group:', systemDefault);
  console.log('Total groups:', groups.length);
}
test().then(() => process.exit(0));
```

Run: `node test-seed.js`
Expected: System default group exists in database

**Step 4: Clean up and commit**

```bash
rm test-seed.js
git add src/lib/db/ai-playground.ts
git commit -m "feat(image-studio): ensure system default prompt group on user prefs access"
```

---

## Phase 2: API Enhancement

### Task 2.1: Enhance GET /api/image-studio/settings Response

**Files:**
- Modify: `src/app/api/image-studio/settings/route.ts:84-97`

**Step 1: Modify resolveActiveGroup to include templates in response**

Find the `resolveActiveGroup` function (around line 84) and replace it:

```typescript
// src/app/api/image-studio/settings/route.ts

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
```

**Step 2: Modify buildSettingsResponse to include all template fields**

Find the `buildSettingsResponse` function (around line 27) and update:

```typescript
// src/app/api/image-studio/settings/route.ts

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
    // Existing settings
    api_base: additional.api_base || envConfigs.python_api_url || '',
    api_key: additional.api_key || '',
    model: additional.model || '',
    target_width: prefs?.targetWidth || 1500,
    target_height: prefs?.targetHeight || 2000,
    default_temperature: defaultTemp,
    resume_mode: Boolean(additional.resume_mode),
    continuous_view_enabled: Boolean(additional.continuous_view_enabled),
    show_final_prompt_text: Boolean(additional.show_final_prompt_text),

    // Prompt groups list
    prompt_groups: groups,
    active_prompt_group_id: activeGroupId,
    active_prompt_group_name: activeGroupName,
    use_english_prompts: Boolean(prefs?.useEnglish),

    // NEW: All template values from active group (inline, no separate request needed)
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

    // Additional non-grouped templates
    pro_plan_instruction_cn: additional.pro_plan_instruction_cn || '',
  };
}
```

**Step 3: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Test the API endpoint**

Run: `curl http://localhost:3000/api/image-studio/settings -H "Cookie: <your-session>"`
Expected: Response includes `prompt_groups`, `active_prompt_group_id`, and all `prompt_*_cn` fields

**Step 5: Commit**

```bash
git add src/app/api/image-studio/settings/route.ts
git commit -m "feat(image-studio): consolidate prompt groups into settings response"
```

---

### Task 2.2: Add Prompt Validation to POST /api/image-studio/jobs

**Files:**
- Modify: `src/app/api/image-studio/jobs/route.ts` (add validation before line 62)

**Step 1: Add validation function and call it**

Add this after the imports (before the GET handler):

```typescript
// src/app/api/image-studio/jobs/route.ts

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
```

**Step 2: Call validation in POST handler**

Find the POST handler (line 42) and add validation after the initial checks:

```typescript
// src/app/api/image-studio/jobs/route.ts

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

    if (!mode || !sku) {
      return respErr('mode/sku required');
    }

    // NEW: Validate prompt configuration before processing
    const validation = await validatePromptForJob(user.id);
    if (!validation.valid) {
      return respErr(validation.error);
    }

    console.info('[ImageStudio] Prompt validation passed', {
      groupId: validation.group?.id,
      groupName: validation.group?.name,
    });

    // ... rest of existing code continues
```

**Step 3: Include prompt_group_id in job config**

Find where `jobConfig` is created (around line 216) and add:

```typescript
// src/app/api/image-studio/jobs/route.ts

    const jobConfig: Record<string, any> = {
      mode,
      sku,
      stem: resolvedStem || null,
      options: jobOptions,
      // NEW: Include prompt_group_id for tracing/debugging
      prompt_group_id: validation.group?.id || activeGroupId,
    };
```

**Step 4: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Test validation**

Test with missing prompt group:
```bash
curl -X POST http://localhost:3000/api/image-studio/jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session>" \
  -d '{"mode":"image_custom_generate","sku":"test","stem":"test"}'
```
Expected: Returns error if prompt group not configured

**Step 6: Commit**

```bash
git add src/app/api/image-studio/jobs/route.ts
git commit -m "feat(image-studio): add prompt validation before job creation"
```

---

## Phase 3: Frontend UI

### Task 3.1: Update StudioSettings Type

**Files:**
- Modify: `src/shared/blocks/image-studio/types.ts:42-48`

**Step 1: Extend StudioSettings interface**

Find the `StudioSettings` interface (around line 42) and extend it:

```typescript
// src/shared/blocks/image-studio/types.ts

// Settings for the image studio
export interface StudioSettings {
  // Existing settings
  imageSize: ImageSize;
  imageFormat: ImageFormat;
  quality: number;
  preserveOriginal: boolean;

  // NEW: Prompt group fields
  prompt_groups?: PromptGroup[];
  active_prompt_group_id?: string;
  active_prompt_group_name?: string;
  use_english_prompts?: boolean;

  // NEW: Template fields (all 21 from GROUP_PROMPT_KEYS)
  prompt_common_cn?: string;
  prompt_main_cn?: string;
  prompt_secondary_cn?: string;
  style_main_prompt_cn?: string;
  style_extract_instruction_cn?: string;
  title_details_prompt_cn?: string;
  opt_remove_watermark_cn?: string;
  opt_remove_logo_cn?: string;
  opt_text_edit_cn?: string;
  opt_restructure_cn?: string;
  opt_recolor_cn?: string;
  opt_add_markers_cn?: string;
  prompt_common_en?: string;
  prompt_main_en?: string;
  prompt_secondary_en?: string;
  style_main_prompt_en?: string;
  style_extract_instruction_en?: string;
  title_details_prompt_en?: string;
  opt_remove_watermark_en?: string;
  opt_remove_logo_en?: string;
  opt_text_edit_en?: string;
  opt_restructure_en?: string;
  opt_recolor_en?: string;
  opt_add_markers_en?: string;
  pro_plan_instruction_cn?: string;
}

// NEW: Prompt group type
export interface PromptGroup {
  id: string;
  name: string;
}
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/blocks/image-studio/types.ts
git commit -m "feat(image-studio): extend StudioSettings type with prompt group fields"
```

---

### Task 3.2: Create PromptGroupSelector Component

**Files:**
- Create: `src/shared/blocks/image-studio/components/PromptGroupSelector.tsx`

**Step 1: Create the selector component**

```typescript
// src/shared/blocks/image-studio/components/PromptGroupSelector.tsx

/**
 * PromptGroupSelector Component
 * Dropdown selector for switching between prompt groups in TopBar
 */

'use client';

import { useImageStudio } from '@/shared/contexts/image-studio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Layers } from 'lucide-react';

interface PromptGroupSelectorProps {
  className?: string;
}

export function PromptGroupSelector({ className }: PromptGroupSelectorProps) {
  const { settings, updateSettings } = useImageStudio();

  const groups = settings.prompt_groups || [];
  const activeId = settings.active_prompt_group_id || '';
  const activeName = settings.active_prompt_group_name || '';

  const handleChange = async (id: string) => {
    if (id === activeId) return; // No change needed

    try {
      const response = await fetch('/api/image-studio/prompt-groups/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to switch prompt group');
      }

      // Refresh settings to get new active group templates
      const settingsRes = await fetch('/api/image-studio/settings');
      const data = await settingsRes.json();
      if (data.code === 0) {
        updateSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to switch prompt group:', err);
      // Could show toast notification here
    }
  };

  // Don't render if no groups available
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Layers className="h-4 w-4 text-neutral-500" />
      <Select value={activeId} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="选择提示词组">
            {activeName || '选择提示词组'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((group: { id: string; name: string }) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/blocks/image-studio/components/PromptGroupSelector.tsx
git commit -m "feat(image-studio): add PromptGroupSelector component"
```

---

### Task 3.3: Integrate PromptGroupSelector into TopBar

**Files:**
- Modify: `src/shared/blocks/image-studio/components/TopBar.tsx:44-82`

**Step 1: Add import and place selector in navigation area**

```typescript
// src/shared/blocks/image-studio/components/TopBar.tsx

import { PromptGroupSelector } from './PromptGroupSelector';  // NEW import

export function TopBar() {
  const { currentSKU, isLoading, error, openModal } = useImageStudio();
  // ... existing code ...

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo Section */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          {/* ... existing logo code ... */}
        </div>

        {/* NEW: Prompt Group Selector */}
        <PromptGroupSelector className="ml-4" />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {/* ... existing tabs ... */}
        </div>
      </div>

      {/* Right Section - unchanged */}
      {/* ... */}
    </header>
  );
}
```

**Full modified section (lines 46-82):**

```typescript
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900">Image Studio</span>
          </div>
          <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            PRO
          </Badge>
        </div>

        {/* NEW: Prompt Group Selector */}
        <PromptGroupSelector className="ml-4" />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('process')}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'process'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            图片处理
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            历史记录
          </button>
        </div>
      </div>
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Visual check**

Run dev server and verify:
- TopBar shows prompt group dropdown
- Dropdown lists available groups
- Selection works

**Step 4: Commit**

```bash
git add src/shared/blocks/image-studio/components/TopBar.tsx
git commit -m "feat(image-studio): add prompt group selector to TopBar"
```

---

### Task 3.4: Remove Waterfall in ImageStudioContext

**Files:**
- Modify: `src/shared/contexts/image-studio.tsx:102-112`

**Step 1: Update useEffect to use single consolidated request**

```typescript
// src/shared/contexts/image-studio.tsx

  // Load settings, prompt group, and SKUs on mount
  useEffect(() => {
    // NEW: Single consolidated request (eliminates waterfall)
    api.getSettings()
      .then(data => {
        setSettings(data);
        // Active group info is now inline in settings
        setActivePromptGroup({
          id: data.active_prompt_group_id || '',
          name: data.active_prompt_group_name || '',
        });
      })
      .catch(console.error);

    loadBatchStats();
    loadSKUs();
  }, []);
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No errors (might need to adjust getSettings return type)

**Step 3: Verify API client returns correct type**

Check `src/lib/api/image-studio.ts:getSettings()` - it should already return the consolidated response from Task 2.1.

**Step 4: Test in browser**

Open DevTools Network tab:
- Before: 2 requests on mount (settings + prompt-groups)
- After: 1 request on mount (settings with groups inline)

**Step 5: Commit**

```bash
git add src/shared/contexts/image-studio.tsx
git commit -m "perf(image-studio): remove waterfall request, use consolidated settings API"
```

---

## Phase 4: FastAPI Validation (Optional - Backend Team)

### Task 4.1: Add Prompt Validation to FastAPI

**Files:**
- Modify: FastAPI image processing endpoint (Python)

**Step 1: Add validation function**

```python
# In FastAPI image processing module

from typing import Tuple, Optional

def validate_prompt_payload(payload: dict) -> Tuple[bool, Optional[str]]:
    """
    Validate that the assembled prompt is not empty before calling AI model.

    Args:
        payload: Request payload containing prompt configuration

    Returns:
        (is_valid, error_message)
    """
    # Check various possible prompt fields
    prompt = (
        payload.get("prompt") or
        payload.get("final_prompt") or
        payload.get("effective_prompt") or
        payload.get("options", {}).get("prompt_templates", {}).get("common_cn") or
        ""
    )

    if not prompt or not str(prompt).strip():
        return False, "提示词为空，请检查提示词组配置"

    # Check minimum reasonable length
    if len(str(prompt).strip()) < 10:
        return False, "提示词过短，请补充内容"

    return True, None
```

**Step 2: Call validation in endpoint**

```python
@app.post("/api/generate")
async def generate_image(request: Request):
    payload = await request.json()

    # Validate prompt before expensive API call
    is_valid, error_msg = validate_prompt_payload(payload)
    if not is_valid:
        return {"error": error_msg, "success": False}, 400

    # Log with prompt group ID for tracing
    prompt_group_id = payload.get("prompt_group_id", "unknown")
    logger.info(f"Processing generation with prompt_group={prompt_group_id}")

    # ... continue with AI API call
```

**Step 3: Commit**

```bash
git add fastapi/processing_endpoint.py
git commit -m "feat(image-studio): add prompt validation in FastAPI before AI call"
```

---

## Verification Checklist

### Database
- [ ] System default prompt group exists after first run
- [ ] Group has ID `system-default-cn`
- [ ] Group contains all 21 template keys
- [ ] `title_details_prompt_cn` has default content
- [ ] `style_main_prompt_cn` has default content

### API
- [ ] GET /settings returns `prompt_groups` array
- [ ] GET /settings returns `active_prompt_group_id`
- [ ] GET /settings returns all `prompt_*_cn` fields inline
- [ ] POST /jobs returns error if no active prompt group
- [ ] POST /jobs returns error if templates empty
- [ ] Job config includes `prompt_group_id`

### Frontend
- [ ] TopBar shows prompt group dropdown
- [ ] Dropdown lists all available groups
- [ ] Switching groups updates active selection
- [ ] Single request on page load (no waterfall)
- [ ] Active group name shows in selector

### FastAPI (if implemented)
- [ ] Empty prompts rejected before AI call
- [ ] Logs include `prompt_group_id`

---

## Rollback Plan

If issues arise:

1. **Frontend waterfall issue:**
   - Revert `src/shared/contexts/image-studio.tsx`
   - Restore separate `getActivePromptGroup()` call

2. **API response changes:**
   - GET /settings is backward compatible (additive fields only)
   - Frontend gracefully handles missing `prompt_groups`

3. **Validation blocking users:**
   - Comment out `validatePromptForJob()` call in jobs/route.ts
   - Log issue for investigation

4. **System default group conflicts:**
   - Set `isSystemDefault` to false for existing user groups
   - System default ID is unique (`system-default-cn`)

---

## Related Skills

- @superpowers:subagent-driven-development - For executing this plan with subagents
- @superpowers:executing-plans - For batch execution in parallel session
- @superpowers:code-reviewer - For reviewing implementation after completion

---

**Plan Version:** 1.0
**Created:** 2026-01-21
**Estimated Tasks:** 14 tasks across 4 phases
**Estimated Time:** 3-4 hours for full implementation
