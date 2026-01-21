# ImageStudio Prompt Management Upgrade Design Document

**Date:** 2026-01-21
**Module:** `src/app/[locale]/(user)/dashboard/imagestudio`
**Status:** Design Phase
**Reference:** `dev/ozon-backen/demo2` implementation

---

## Executive Summary

This document outlines the upgrade plan for ImageStudio's prompt management system. The current implementation lacks a system default prompt group, has client-side waterfall issues, and missing validation. This upgrade aligns the frontend implementation with the proven patterns from `demo2` while adding enterprise-grade validation and UX improvements.

### Key Changes

| Area | Current State | Target State |
|------|--------------|--------------|
| Database | No system default group | Seeded system default with all templates |
| Frontend | Separate requests for settings + groups | Single consolidated request |
| UI | No prompt group selector | TopBar dropdown selector |
| Validation | None | Dual-layer (Next.js + FastAPI) |
| Tracing | No prompt group tracking | Job includes `prompt_group_id` |

---

## Table of Contents

1. [Current Problems](#current-problems)
2. [Architecture Overview](#architecture-overview)
3. [Database Design](#database-design)
4. [API Design (Next.js)](#api-design-nextjs)
5. [Frontend Design](#frontend-design)
6. [Backend Design (FastAPI)](#backend-design-fastapi)
7. [Implementation Plan](#implementation-plan)
8. [Testing Strategy](#testing-strategy)
9. [Migration Path](#migration-path)

---

## Current Problems

### 1. No System Default Prompt Group
**Location:** `src/lib/db/ai-playground.ts`

New users have no default prompt templates. The `ai_prompt_group` table may be empty, causing:
- Empty prompts sent to AI model
- Poor first-time user experience
- Inconsistent behavior across environments

### 2. Client-Side Waterfall
**Location:** `src/shared/contexts/image-studio.tsx:102-112`

```typescript
// Current: Two sequential requests
api.getSettings().then(setSettings);
api.getActivePromptGroup().then(setActivePromptGroup);
```

Impact: Slower page load, unnecessary latency.

### 3. No Prompt Validation
**Location:** `src/app/api/image-studio/jobs/route.ts`

Empty or missing prompts can reach the FastAPI backend, resulting in:
- Wasted API calls
- Confusing error messages from AI provider
- Poor user experience

### 4. Missing UI for Prompt Group Selection
**Location:** `src/shared/blocks/image-studio/components/modals/SettingsModal.tsx`

Users cannot easily switch between prompt groups. The UI has:
- Settings (image size, format)
- But no prompt group selector

### 5. Demo2 Drift
**Location:** `dev/ozon-backen/demo2/web_server.py`

The reference implementation has:
- `_ensure_prompt_groups()` for auto-creation
- `GROUP_PROMPT_KEYS` with all template types
- Validation and fallback logic

These features are not ported to the Next.js implementation.

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Browser)                           │
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐ │
│  │     TopBar       │    │  SettingsModal   │    │ ImageStudioContext │ │
│  │  (Prompt Group   │    │  (Edit Templates │    │  (State + API)     │ │
│  │   Selector)      │    │   + Config)      │    │                    │ │
│  └────────┬─────────┘    └────────┬─────────┘    └─────────┬──────────┘ │
│           │                       │                        │             │
│           └───────────────────────┴────────────────────────┘             │
│                                   │                                      │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   GET /api/image-studio/      │
                    │        settings               │
                    │ (single response: settings +  │
                    │  active group + all groups)   │
                    └───────────────┬───────────────┘
                                    │
┌───────────────────────────────────┼──────────────────────────────────────┐
│                        Next.js API Routes                                │
│                                                                           │
│  ┌────────────────────────────┴───────────────────────────────────────┐  │
│  │ GET/POST /api/image-studio/settings                                │  │
│  │ - Returns merged response (settings + active + groups)              │  │
│  │ - Validates prompt templates on save                                │  │
│  └────────────────────────────┬───────────────────────────────────────┘  │
│  ┌────────────────────────────┴───────────────────────────────────────┐  │
│  │ POST /api/image-studio/jobs                                         │  │
│  │ - Validates prompt not empty before proxy                           │  │
│  │ - Includes prompt_group_id in job config                            │  │
│  └────────────────────────────┬───────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼──────────────────────────────────────┐
│                         PostgreSQL Database                               │
│                                                                           │
│  ┌────────────────────────────┴───────────────────────────────────────┐  │
│  │ ai_prompt_group (isSystemDefault=true)                              │  │
│  │ ai_prompt_template_v2 (all GROUP_PROMPT_KEYS)                       │  │
│  │ ai_user_prompt_preference (activePromptGroupId)                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Database Design

### Schema

**Table: `ai_prompt_group`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | UUID or timestamp-based ID |
| `user_id` | string \| NULL | NULL for system default |
| `name` | string | Display name |
| `description` | string \| NULL | Optional description |
| `is_system_default` | boolean | TRUE for seeded default |
| `is_active` | boolean | Soft delete flag |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update |

**Table: `ai_prompt_template_v2`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | UUID |
| `prompt_group_id` | string | FK to ai_prompt_group |
| `template_key` | string | e.g., "common_cn", "main_cn" |
| `template_content` | text | The prompt template |
| `language` | string | "cn" or "en" |
| `category` | string \| NULL | Optional category |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Table: `ai_user_prompt_preference`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | UUID |
| `user_id` | string | FK to users |
| `active_prompt_group_id` | string | Currently selected group |
| `use_english` | boolean | Use English prompts |
| `additional_settings` | jsonb | Extra settings |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Template Keys (from demo2)

```javascript
const GROUP_PROMPT_KEYS = [
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
];
```

### Default Content

**`title_details_prompt_cn`:**
```
要求：
1) 请根据标题与详情结合图片内容与图片上的文字，整体理解产品真实属性与款式。
2) 卖点/亮点必须谨慎：只能在图片文字/标题/详情明确支持时总结，禁止臆测与夸大。
3) 不确定的信息不要写，不要编造规格、材质、功能、品牌、认证、适配范围等。
4) 执行图生图任务时仍需严格保持现有文字不变，禁止增加图片文字、标题、详情之外的文字描述。
5) 根据标题与详情结合图片内容与图片上的文字，总结卖点亮点等主图需要的文字，并配合主图表达，按电商主图文案习惯均匀分布到几张主图中；尤其注意第一张主图文字要突出亮点卖点。
```

**`style_main_prompt_cn`:**
```
主图风格统一，背景材质与光照一致，产品主体突出，稳重简洁。
```

---

## API Design (Next.js)

### 1. GET /api/image-studio/settings (Enhanced)

**Current Response:**
```json
{
  "code": 0,
  "data": {
    "api_base": "...",
    "target_width": 1500,
    "prompt_groups": [],
    "active_prompt_group_id": ""
  }
}
```

**Enhanced Response:**
```json
{
  "code": 0,
  "data": {
    // Existing settings
    "api_base": "...",
    "target_width": 1500,
    "target_height": 2000,
    "default_temperature": 0.5,
    "resume_mode": false,
    "continuous_view_enabled": false,
    "show_final_prompt_text": false,

    // Prompt groups (NEW: includes full active group)
    "prompt_groups": [
      { "id": "g1", "name": "提示词一" },
      { "id": "system-default", "name": "系统默认" }
    ],
    "active_prompt_group_id": "g1",
    "active_prompt_group_name": "提示词一",

    // All templates from active group (NEW: inline)
    "prompt_common_cn": "...",
    "prompt_main_cn": "...",
    "prompt_secondary_cn": "...",
    "style_main_prompt_cn": "...",
    "title_details_prompt_cn": "...",
    // ... all GROUP_PROMPT_KEYS

    // Additional templates (non-grouped)
    "pro_plan_instruction_cn": "..."
  }
}
```

**Implementation:** `src/app/api/image-studio/settings/route.ts:99-115`

```typescript
async function resolveActiveGroup(userId: string, prefs: any) {
  const groups = await aiPlaygroundDb.getPromptGroups(userId);
  let activeGroupId = prefs?.activePromptGroupId || '';

  // Fallback to first group if none set
  if (!activeGroupId && groups.length) {
    activeGroupId = groups[0].id;
    // Auto-set it
    await aiPlaygroundDb.updateUserPromptPreferences(userId, {
      activePromptGroupId: activeGroupId
    });
  }

  let group = null;
  if (activeGroupId) {
    group = await aiPlaygroundDb.getPromptGroupWithTemplates(activeGroupId);
  }

  return { groups, group, activeGroupId };
}
```

### 2. POST /api/image-studio/jobs (Validation)

**New Validation Layer:**

```typescript
// src/app/api/image-studio/jobs/route.ts

interface PromptValidationResult {
  valid: boolean;
  error?: string;
  group?: any;
}

async function validatePromptForJob(
  userId: string
): Promise<PromptValidationResult> {
  const prefs = await aiPlaygroundDb.getUserPromptPreferences(userId);
  const activeId = prefs.activePromptGroupId;

  // Check 1: Active group is set
  if (!activeId) {
    return {
      valid: false,
      error: '未设置提示词组，请在设置中选择或创建提示词组'
    };
  }

  // Check 2: Group exists
  const group = await aiPlaygroundDb.getPromptGroupWithTemplates(activeId);
  if (!group) {
    return {
      valid: false,
      error: '选中的提示词组不存在，请重新选择'
    };
  }

  // Check 3: Has required templates
  const templates = group.prompt_templates || {};
  const hasCommon = templates.common_cn || templates.common_en;

  if (!hasCommon) {
    return {
      valid: false,
      error: '提示词组缺少必需模板，请在设置中配置'
    };
  }

  return { valid: true, group };
}

// In POST handler
export async function POST(req: Request) {
  const user = await getUserInfo();
  // ... existing code ...

  // NEW: Validate before processing
  const validation = await validatePromptForJob(user.id);
  if (!validation.valid) {
    return respErr(validation.error);
  }

  // Include prompt_group_id in job config for tracing
  const jobConfig = {
    mode: 'image_custom_generate',
    sku: skuId,
    stem: pairId,
    options: { ... },
    prompt_group_id: validation.group.id, // NEW
  };

  // ... rest of processing
}
```

### 3. POST /api/image-studio/prompt-groups/active (Existing)

No changes needed - already exists at:
`src/app/api/image-studio/prompt-groups/active/route.ts`

---

## Frontend Design

### 1. Prompt Group Selector Component

**File:** `src/shared/blocks/image-studio/components/PromptGroupSelector.tsx`

```typescript
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

  const handleChange = async (id: string) => {
    try {
      const response = await fetch('/api/image-studio/prompt-groups/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch prompt group');
      }

      // Refresh settings to get new active group templates
      const settingsRes = await fetch('/api/image-studio/settings');
      const data = await settingsRes.json();
      if (data.code === 0) {
        updateSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to switch prompt group:', err);
    }
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Layers className="h-4 w-4 text-neutral-500" />
      <Select value={activeId} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="选择提示词组" />
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

### 2. TopBar Integration

**File:** `src/shared/blocks/image-studio/components/TopBar.tsx`

Add the selector to the toolbar:

```typescript
import { PromptGroupSelector } from './PromptGroupSelector';

export function TopBar() {
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Logo />
        <Breadcrumb />
        {/* NEW: Prompt group selector */}
        <PromptGroupSelector />
      </div>

      {/* Right side - existing controls */}
      <div className="flex items-center gap-2">
        {/* ... existing buttons ... */}
      </div>
    </div>
  );
}
```

### 3. Context Optimization

**File:** `src/shared/contexts/image-studio.tsx`

**Before (lines 102-112):**
```typescript
useEffect(() => {
  api.getSettings().then(setSettings).catch(console.error);
  loadBatchStats();
  loadSKUs();

  // Separate request - causes waterfall
  api.getActivePromptGroup()
    .then(setActivePromptGroup)
    .catch(console.error);
}, []);
```

**After:**
```typescript
useEffect(() => {
  // Single consolidated request
  api.getSettingsWithGroups().then(data => {
    setSettings(data);
    // Active group is now inline in settings
    setActivePromptGroup({
      id: data.active_prompt_group_id,
      name: data.active_prompt_group_name,
    });
  }).catch(console.error);

  loadBatchStats();
  loadSKUs();
}, []);
```

**API Client Update:**

**File:** `src/lib/api/image-studio.ts`

```typescript
/**
 * Get settings with prompt groups (single request)
 * Eliminates waterfall from separate getSettings + getActivePromptGroup
 */
export async function getSettingsWithGroups(): Promise<StudioSettings & {
  prompt_groups: Array<{ id: string; name: string }>;
  active_prompt_group_id: string;
  active_prompt_group_name: string;
}> {
  const response = await fetch(`${API_BASE}/settings`);
  const data = await handleResponse<any>(response);

  if (data.code !== 0) {
    throw new Error(data.message || 'Failed to load settings');
  }

  const raw = data.data || {};
  return {
    // Existing settings
    imageSize: `${raw.target_width || 1536}x${raw.target_height || 1536}`,
    imageFormat: raw.image_format || 'png',
    quality: raw.quality || 90,
    preserveOriginal: Boolean(raw.preserve_original),

    // Prompt groups (NEW)
    prompt_groups: raw.prompt_groups || [],
    active_prompt_group_id: raw.active_prompt_group_id || '',
    active_prompt_group_name: raw.active_prompt_group_name || '',

    // All template values (NEW)
    prompt_common_cn: raw.prompt_common_cn || '',
    prompt_main_cn: raw.prompt_main_cn || '',
    // ... all GROUP_PROMPT_KEYS
  };
}
```

### 4. Types Update

**File:** `src/shared/blocks/image-studio/types.ts`

```typescript
export interface StudioSettings {
  // Existing
  imageSize: '1024x1024' | '1536x1536' | '2048x2048';
  imageFormat: 'png' | 'jpg' | 'webp';
  quality: number;
  preserveOriginal: boolean;

  // NEW: Prompt group fields
  prompt_groups?: Array<{ id: string; name: string }>;
  active_prompt_group_id?: string;
  active_prompt_group_name?: string;

  // NEW: Template fields (all from GROUP_PROMPT_KEYS)
  prompt_common_cn?: string;
  prompt_main_cn?: string;
  prompt_secondary_cn?: string;
  style_main_prompt_cn?: string;
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
  title_details_prompt_en?: string;
  opt_remove_watermark_en?: string;
  opt_remove_logo_en?: string;
  opt_text_edit_en?: string;
  opt_restructure_en?: string;
  opt_recolor_en?: string;
  opt_add_markers_en?: string;
}
```

---

## Backend Design (FastAPI)

### Prompt Validation Before AI Call

**Location:** FastAPI image processing endpoint

```python
from typing import Tuple, Optional

def validate_prompt_payload(payload: dict) -> Tuple[bool, Optional[str]]:
    """
    Validate that the assembled prompt is not empty before calling AI model.

    Returns:
        (is_valid, error_message)
    """
    # Check various possible prompt fields
    prompt = (
        payload.get("prompt") or
        payload.get("final_prompt") or
        payload.get("effective_prompt") or
        ""
    )

    if not prompt or not prompt.strip():
        return False, "提示词为空，请检查提示词组配置"

    # Check minimum reasonable length
    if len(prompt.strip()) < 10:
        return False, "提示词过短，请补充内容"

    return True, None


# In the processing endpoint:
@app.post("/api/generate")
async def generate_image(request: Request):
    payload = await request.json()

    # Validate prompt before expensive API call
    is_valid, error_msg = validate_prompt_payload(payload)
    if not is_valid:
        return {"error": error_msg}, 400

    # Log with prompt group ID for tracing
    prompt_group_id = payload.get("prompt_group_id", "unknown")
    logger.info(f"Processing generation with prompt_group={prompt_group_id}")

    # ... proceed with AI API call
```

### Logging Enhancement

```python
import logging

logger = logging.getLogger(__name__)

# Log job with prompt group context
logger.info(
    f"Job {job_id} started: "
    f"user={user_id}, "
    f"prompt_group={prompt_group_id}, "
    f"mode={mode}, "
    f"sku={sku}"
)

# This enables tracing which prompt group was used for each job
# Useful for debugging and analytics
```

---

## Implementation Plan

### Phase 1: Database Foundation
**Priority:** High (blocks other phases)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `src/lib/db/seed/prompt-groups.ts` | Create seed script |
| 1.2 | `src/lib/db/ai-playground.ts` | Add `ensureSystemDefaultPromptGroup()` |
| 1.3 | `src/lib/db/ai-playground.ts` | Update `getUserPromptPreferences()` to call ensure |

**Acceptance Criteria:**
- System default prompt group exists after first run
- Group contains all 21 template keys
- Templates have default content from demo2

### Phase 2: API Enhancement
**Priority:** High (enables frontend)

| Task | File | Description |
|------|------|-------------|
| 2.1 | `src/app/api/image-studio/settings/route.ts` | Consolidate response with active group |
| 2.2 | `src/app/api/image-studio/jobs/route.ts` | Add prompt validation |
| 2.3 | `src/app/api/image-studio/jobs/route.ts` | Include prompt_group_id in job config |

**Acceptance Criteria:**
- GET /settings returns active group with templates
- POST /jobs validates prompt before processing
- Job logs include prompt_group_id

### Phase 3: Frontend UI
**Priority:** Medium (user-facing)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `src/shared/blocks/image-studio/components/PromptGroupSelector.tsx` | Create selector component |
| 3.2 | `src/shared/blocks/image-studio/components/TopBar.tsx` | Add selector to toolbar |
| 3.3 | `src/shared/contexts/image-studio.tsx` | Remove waterfall, use consolidated API |
| 3.4 | `src/lib/api/image-studio.ts` | Update getSettings to getSettingsWithGroups |
| 3.5 | `src/shared/blocks/image-studio/types.ts` | Add prompt group types |

**Acceptance Criteria:**
- TopBar shows prompt group dropdown
- Switching group updates active selection
- Single request on page load

### Phase 4: FastAPI Validation
**Priority:** Medium (safety net)

| Task | File | Description |
|------|------|-------------|
| 4.1 | FastAPI processing endpoint | Add validate_prompt_payload() |
| 4.2 | FastAPI logging | Include prompt_group_id in logs |

**Acceptance Criteria:**
- Empty prompts rejected before AI call
- Logs include prompt group context

---

## Testing Strategy

### Unit Tests

**Database Layer:**
```typescript
describe('aiPlaygroundDb.ensureSystemDefaultPromptGroup', () => {
  it('should create system default if not exists', async () => {
    await aiPlaygroundDb.ensureSystemDefaultPromptGroup();
    const groups = await aiPlaygroundDb.getPromptGroups();
    const systemDefault = groups.find(g => g.isSystemDefault);
    expect(systemDefault).toBeDefined();
  });

  it('should not duplicate existing system default', async () => {
    await aiPlaygroundDb.ensureSystemDefaultPromptGroup();
    await aiPlaygroundDb.ensureSystemDefaultPromptGroup();
    const groups = await aiPlaygroundDb.getPromptGroups();
    const systemDefaults = groups.filter(g => g.isSystemDefault);
    expect(systemDefaults.length).toBe(1);
  });
});
```

**API Validation:**
```typescript
describe('validatePromptForJob', () => {
  it('should reject when no active group', async () => {
    const result = await validatePromptForJob('user-without-group');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('未设置提示词组');
  });

  it('should reject when templates empty', async () => {
    const result = await validatePromptForJob('user-with-empty-group');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('缺少必需模板');
  });
});
```

### Integration Tests

**Settings Endpoint:**
```typescript
describe('GET /api/image-studio/settings', () => {
  it('should return active group with templates', async () => {
    const response = await fetch('/api/image-studio/settings');
    const data = await response.json();

    expect(data.data.prompt_groups).toBeInstanceOf(Array);
    expect(data.data.active_prompt_group_id).toBeTruthy();
    expect(data.data.prompt_common_cn).toBeDefined();
  });
});
```

### E2E Tests

**Prompt Group Switching:**
```typescript
test('user can switch prompt groups', async ({ page }) => {
  await page.goto('/dashboard/imagestudio');
  await page.click('[data-testid="prompt-group-selector"]');
  await page.click('text=系统默认');
  await expect(page.locator('[data-testid="prompt-group-selector"]'))
    .toContainText('系统默认');
});
```

---

## Migration Path

### For Existing Users

1. **Current users with prompt groups:** No impact, continue using existing groups
2. **Current users without groups:** System default becomes available as fallback
3. **Active group missing:** Auto-assign first available group

### Backward Compatibility

- Existing API responses maintain all current fields
- New fields are additive (prompt_groups, active_prompt_group_id)
- Frontend gracefully handles missing data

### Rollback Plan

If issues arise:
1. Revert frontend to use separate `getActivePromptGroup()` call
2. Disable validation in jobs route
3. Keep system default group (harmless if unused)

---

## Appendix

### File Changes Summary

| File | Change Type | Lines Added |
|------|-------------|-------------|
| `src/lib/db/seed/prompt-groups.ts` | New | ~150 |
| `src/lib/db/ai-playground.ts` | Modified | ~30 |
| `src/app/api/image-studio/settings/route.ts` | Modified | ~20 |
| `src/app/api/image-studio/jobs/route.ts` | Modified | ~40 |
| `src/shared/blocks/image-studio/components/PromptGroupSelector.tsx` | New | ~80 |
| `src/shared/blocks/image-studio/components/TopBar.tsx` | Modified | ~5 |
| `src/shared/contexts/image-studio.tsx` | Modified | ~15 |
| `src/lib/api/image-studio.ts` | Modified | ~50 |
| `src/shared/blocks/image-studio/types.ts` | Modified | ~30 |
| **Total** | | **~420** |

### Reference Implementation

**File:** `dev/ozon-backen/demo2/web_server.py`

Key functions to reference:
- `_ensure_prompt_groups()` (lines ~75-150)
- `_get_prompt_group_state()` (lines ~150-180)
- `GROUP_PROMPT_KEYS` (lines ~40-60)

### Related Documents

- `2026-01-20-imagestudio-design.md` - Original ImageStudio design
- `2026-01-20-imagestudio-implementation.md` - Original implementation
- `2025-01-20-ai-prompt-template-database.md` - Prompt template database design

---

**Document Version:** 1.0
**Last Updated:** 2026-01-21
