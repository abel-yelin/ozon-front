# ImageStudio 代码与功能说明（前端 / API / 后端 / 数据库）

本文档用于快速理解 ImageStudio 在本项目中的实现方式：前端 UI、Next.js API（主后端）、FastAPI（重任务后端）、数据库结构与数据流。

## 1. 整体架构概览

- 前端：Next.js 页面 + React 组件（ImageStudio UI/UX）。
- 主后端：Next.js API Routes 负责鉴权、数据库读写、组装任务参数、回写结果。
- 重任务后端：FastAPI 仅做图片处理（从 URL 下载图片、调用处理引擎、上传 R2）。
- 数据存储：图片在 R2；任务/结果/配置存在 PostgreSQL（schema 在 `src/config/db/schema.postgres.ts`）。

## 2. 前端（Next.js UI）

入口页面：
- `src/app/[locale]/(user)/dashboard/imagestudio/page.tsx`

核心状态管理：
- `src/shared/contexts/image-studio.tsx`
- `src/app/hooks/use-image-studio.ts`

主要组件：
- 顶部栏：`src/shared/blocks/image-studio/components/TopBar.tsx`
- 左侧列表：`src/shared/blocks/image-studio/components/LeftSidebar.tsx`
- 主内容区：`src/shared/blocks/image-studio/components/MainContent.tsx`
- 图片对比：`src/shared/blocks/image-studio/components/ImageComparison.tsx`
- 弹窗：
  - 预览：`src/shared/blocks/image-studio/components/modals/ImageModal.tsx`
  - 图片编辑：`src/shared/blocks/image-studio/components/modals/EditImageModal.tsx`
  - 参数选择：`src/shared/blocks/image-studio/components/modals/OptPromptModal.tsx`
  - 批量进度：`src/shared/blocks/image-studio/components/modals/ProgressModal.tsx`
  - 下载：`src/shared/blocks/image-studio/components/modals/DownloadModal.tsx`
  - 全局设置：`src/shared/blocks/image-studio/components/modals/SettingsModal.tsx`

前端数据类型（简化版）：
- `SKU`：SKU 列表项（状态、是否主图、缩略图等）
- `ImagePair`：输入图 + 输出图对，字段为 `inputUrl`、`outputUrl`、`inputName`、`outputName`、`status`
- 定义位置：`src/shared/blocks/image-studio/types.ts`

前端数据请求封装：
- `src/lib/api/image-studio.ts`

## 3. Next.js API（主后端，负责数据库）

### 3.1 核心 API

- 获取 SKU 列表：
  - `GET /api/image-studio/folders`
  - 实现：`src/app/api/image-studio/folders/route.ts`
  - 基于 gallery + ai_image_pair 统计生成状态

- 获取 SKU 图片对：
  - `GET /api/image-studio/folders/{sku}/pairs`
  - 实现：`src/app/api/image-studio/folders/[sku]/pairs/route.ts`

- 任务提交 / 列表：
  - `POST /api/image-studio/jobs`（提交）
  - `GET /api/image-studio/jobs`（列表 + 同步 FastAPI 状态）
  - 实现：`src/app/api/image-studio/jobs/route.ts`
  - 同步逻辑：`src/app/api/image-studio/jobs/helpers.ts`

- 任务状态：
  - `GET /api/image-studio/jobs/{id}`
  - `POST /api/image-studio/jobs/{id}/cancel`
  - 实现：`src/app/api/image-studio/jobs/[id]/route.ts`
  - 取消：`src/app/api/image-studio/jobs/[id]/cancel/route.ts`

- 任务日志：
  - `GET /api/image-studio/job-logs/{id}`
  - 实现：`src/app/api/image-studio/job-logs/[id]/route.ts`

- 设置与提示词：
  - `GET/POST /api/image-studio/settings`
  - `GET/POST /api/image-studio/prompt-groups`
  - `POST /api/image-studio/prompt-groups/active`
  - 实现：`src/app/api/image-studio/settings/route.ts` 等

### 3.2 其它辅助 API

- 审核、归档、删除：
  - `POST /api/image-studio/review/approve`
  - `POST /api/image-studio/review/batch`
  - `POST /api/image-studio/archive`
  - `POST /api/image-studio/archive/activate`
  - `POST /api/image-studio/files/delete`

- 上传、代理：
  - `POST /api/image-studio/upload`
  - `POST /api/image-studio/proxy`

### 3.3 Gallery 数据来源

SKU 的输入图来自 gallery（R2 里已有素材）：
- `src/shared/services/gallery.ts`
- `src/app/api/ozon/gallery/route.ts`

逻辑：优先读取已完成的 ozon task 结果，再补充 ai_image_pair 未生成的 source_url。

## 4. FastAPI（重任务后端）

入口路由：
- `dev/ozon-backen/app/api/v1/image_studio.py`

接口：
- `POST /api/v1/image-studio/jobs`：入队任务
- `GET /api/v1/image-studio/jobs/{id}/status`
- `POST /api/v1/image-studio/jobs/{id}/cancel`
- `GET /api/v1/image-studio/jobs/{id}/logs`

任务队列与日志：
- `dev/ozon-backen/app/services/image_studio_queue.py`

任务执行逻辑：
- `dev/ozon-backen/app/services/image_studio_worker.py`
- 关键点：
  - 从 URL 下载图片到临时目录
  - 调用处理引擎（`image_studio_engine.py`）
  - 结果上传到 R2（`R2Service.upload_bytes`）
  - 支持批量/单图/自定义提示词模式

图像处理引擎（已迁移）：
- `dev/ozon-backen/app/services/image_studio_engine.py`

重要说明：
- FastAPI 已不再依赖 `dev/ozon-backen/demo2`。
- demo2 目录作为旧实现，后续可整体删除。

## 5. 数据库结构（Postgres）

核心表（定义见 `src/config/db/schema.postgres.ts`）：

- `ai_job`：任务信息（mode、状态、sourceImageUrls、resultImageUrls、进度）
- `ai_job_log`：任务日志
- `ai_workflow_state`：SKU 的工作流状态（pending/approved/archived）
- `ai_image_pair`：图片对（source_url / result_url / approved / archived / metadata）
- `ai_prompt_group` + `ai_prompt_template_v2`：提示词组与模板
- `ai_user_prompt_preference`：用户提示词偏好、输出尺寸、模型配置（含 `additional_settings`）

主字段对应关系：
- SKU（前端列表）<-> `ai_workflow_state.name`
- 输入图（素材）<-> `ai_image_pair.source_url`
- 输出图（生成结果）<-> `ai_image_pair.result_url`

## 6. 数据流（从 UI 到结果回写）

1) 前端进入页面：
   - `ImageStudioProvider` 读取 `GET /api/image-studio/settings`
   - `GET /api/image-studio/folders` 读取 SKU 列表

2) 选择 SKU：
   - `GET /api/image-studio/folders/{sku}/pairs` 返回 input/output 对

3) 发起任务（批量或单图）：
   - `POST /api/image-studio/jobs`
   - Next.js 组装 prompt + 用户设置 + gallery sources
   - 调用 FastAPI 入队

4) FastAPI 执行：
   - 下载输入图
   - 处理引擎生成
   - 上传结果到 R2

5) Next.js 同步结果：
   - `GET /api/image-studio/jobs` 或 `GET /api/image-studio/jobs/{id}` 触发同步
   - 读取 FastAPI 状态 + 结果，回写 `ai_job`、`ai_image_pair`

## 7. 权限与鉴权

- Next.js API：使用 `getUserInfo()` 校验登录
- FastAPI：使用 `X-API-Key`（`verify_api_key`）
- Next.js 调用 FastAPI 走 `src/lib/api/image-studio-server.ts`

## 8. 约束与设计原则（本项目约定）

- Next.js 是“主后端”：负责数据库读写与业务状态。
- FastAPI 是“重任务后端”：只处理图片，不直接访问数据库。
- 图片不落地在本地，全部使用 R2 URL。

## 9. 相关文件索引

前端入口：
- `src/app/[locale]/(user)/dashboard/imagestudio/page.tsx`

前端状态与 API：
- `src/shared/contexts/image-studio.tsx`
- `src/lib/api/image-studio.ts`

Next.js API：
- `src/app/api/image-studio/*`
- `src/shared/services/gallery.ts`

FastAPI：
- `dev/ozon-backen/app/api/v1/image_studio.py`
- `dev/ozon-backen/app/services/image_studio_worker.py`
- `dev/ozon-backen/app/services/image_studio_queue.py`
- `dev/ozon-backen/app/services/image_studio_engine.py`

数据库：
- `src/config/db/schema.postgres.ts`
