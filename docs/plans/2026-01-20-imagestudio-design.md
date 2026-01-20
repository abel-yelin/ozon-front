# ImageStudio Page Design Document

**Date:** 2026-01-20
**Status:** Design Phase
**Location:** `src/app/[locale]/(user)/dashboard/imagestudio`

---

## Overview

Create a new **ImageStudio** page within the dashboard that fully replicates the UI and UX from the reference implementation at `dev/ozon-backen/demo2/web`. This is an AI-powered batch image processing system for e-commerce product images.

**Key Requirements:**
- Full-screen app layout (diverging from standard dashboard pattern)
- Connect to existing backend at `dev/ozon-backen/demo2`
- Use English for all UI labels and translations
- Replicate all UI/UX features from reference HTML/CSS

---

## Table of Contents

1. [Page Structure & Layout](#1-page-structure--layout)
2. [Component Architecture](#2-component-architecture)
3. [State Management](#3-state-management)
4. [API Integration](#4-api-integration)
5. [Styling Approach](#5-styling-approach)
6. [Component Breakdown Details](#6-component-breakdown-details)
7. [File Structure](#7-file-structure)
8. [Implementation Considerations](#8-implementation-considerations)

---

## 1. Page Structure & Layout

The ImageStudio page uses a **full-screen app container** layout that diverges from the standard dashboard pattern (no Header/Main components).

### Layout Components

```
┌─────────────────────────────────────────────────────────────┐
│  Full-Page Wrapper (100vh)                                   │
│  ┌─────────┐  Decorative Gradient Lines                     │
│  │ Header  │  (60px height)                                  │
│  ├─────────┼───────────────────────────────────────────────┤
│  │         │  Content Header                                 │
│  │         │  - SKU Title & Subtitle                         │
│  │ Sidebar │  - Mode Tabs (Continuous | Step Review)        │
│  │ (320px) │  - Force Refresh Button                         │
│  │         ├───────────────────────────────────────────────┤
│  │         │  Image Pairs Grid                               │
│  │         │  - Before/After comparison cards                │
│  │         │                                                 │
│  │         ├───────────────────────────────────────────────┤
│  │         │  Batch Processing Footer                        │
│  │         │  - Progress bar & percentage                    │
│  │         │  - Stats (Total/Running/Done/Failed)           │
│  │         │  - Actions (Stop/Start)                         │
│  └─────────┴───────────────────────────────────────────────┘
│                                                              │
│  Modal Overlays (5 modals)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Header Elements

| Component | Description |
|-----------|-------------|
| Logo | Gradient text "AI Image Batch Processing System" |
| Tabs | Segmented control: "Image Processing" \| "History" |
| Actions | Pro Mode, Download, Settings, Upload buttons |
| Time Display | Live current time in top-right |

### Sidebar Elements

| Component | Description |
|-----------|-------------|
| Search | Input with magnifying glass icon for SKU search |
| Bulk Select | "Select All", "Main Images Only" (star), "Approved" (check) |
| Status Filter | Dropdown: All / Not Generated / Main Generated / Done |
| SKU List | Scrollable list with checkboxes, thumbnails, status |
| Archive Footer | Selected count + Archive button |

### Main Content Elements

| Component | Description |
|-----------|-------------|
| SKU Header | Selected SKU title with subtitle |
| Mode Tabs | Continuous Processing \| Step Review |
| Image Grid | Before/after image pair cards |
| Batch Footer | Progress bar, statistics, start/stop buttons |

---

## 2. Component Architecture

### Component Tree

```
ImageStudioContainer (Main Entry)
├── StudioHeader
│   ├── Logo
│   ├── SegmentedTabs (Processing | History)
│   └── ActionButtons (Pro Mode, Download, Settings, Upload)
│
├── StudioSidebar
│   ├── SearchBox
│   ├── BulkSelectControls
│   ├── StatusFilter
│   ├── SKUList (VirtualScroll)
│   │   └── SKUItem (repeated)
│   └── ArchiveFooter
│
├── StudioMainContent
│   ├── ContentHeader
│   │   ├── SKUTitle
│   │   ├── ModeTabs (Continuous | Step Review)
│   │   └── RefreshButton
│   ├── ImagePairsGrid
│   │   └── ImagePairCard (repeated)
│   └── BatchFooter
│       ├── ProgressBar
│       ├── StatsDisplay
│       └── ActionButtons
│
└── Modals
    ├── ImageOperationModal
    ├── ProgressModal
    ├── DownloadModal
    ├── SettingsModal
    └── OptPromptModal
```

### Component Locations

All components located in `src/shared/blocks/image-studio/`

| File | Purpose |
|------|---------|
| `image-studio-container.tsx` | Main wrapper, layout orchestration |
| `header.tsx` | Top header bar |
| `sidebar.tsx` | Left sidebar with filters |
| `main-content.tsx` | Main work area |
| `sku-list.tsx` | Scrollable SKU list |
| `sku-item.tsx` | Single SKU item component |
| `image-pair-card.tsx` | Before/after image card |
| `batch-footer.tsx` | Batch progress footer |
| `modals/*.tsx` | Modal components |

---

## 3. State Management

Using **React Context + hooks** for isolated state management.

### Context Structure

```typescript
interface ImageStudioState {
  // UI State
  activeTab: 'processing' | 'history';
  proMode: boolean;
  selectedMode: 'continuous' | 'step-review';

  // SKU List State
  skuList: SKU[];
  selectedSKUs: Set<string>;
  filterStatus: 'all' | 'not_generated' | 'main_generated' | 'done';
  searchQuery: string;
  onlyMainImages: boolean;
  onlyApproved: boolean;

  // Current Selection
  currentSKU: string | null;
  imagePairs: ImagePair[];

  // Batch Processing
  batchProgress: number;
  batchStats: {
    total: number;
    running: number;
    done: number;
    failed: number;
  };
  isBatchRunning: boolean;

  // Modal State
  activeModal: 'image' | 'progress' | 'download' | 'settings' | 'opt-prompt' | null;
  modalImage: Image | null;

  // Settings
  settings: StudioSettings;
}
```

### Key Actions

| Action | Description |
|--------|-------------|
| `selectSKU(skuId)` | Set current SKU and load image pairs |
| `toggleSKUSelection(skuId)` | Add/remove from selection set |
| `selectAllSKUs()` | Select all visible SKUs |
| `startBatchProcessing()` | Begin batch generation |
| `stopBatchProcessing()` | Cancel batch processing |
| `regenerateImage(imageId, options)` | Regenerate single image with options |
| `optimizeImage(imageId, prompt)` | Optimize current image |
| `openModal(type, data)` | Open specific modal with data |
| `closeModal()` | Close active modal |
| `updateSettings(newSettings)` | Persist settings to localStorage/backend |

### Data Persistence

| Data | Storage |
|------|---------|
| Settings | localStorage + backend API |
| SKU data | Backend API (fetched on demand) |
| Batch progress | Polling backend API |

---

## 4. API Integration

### API Routes

All routes prefixed with `/api/image-studio/`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/skus` | List all SKUs with status |
| GET | `/skus/:id` | Get single SKU details |
| POST | `/skus/archive` | Archive selected SKUs |
| GET | `/pairs/:skuId` | Get image pairs for SKU |
| POST | `/regenerate` | Regenerate image with options |
| POST | `/optimize` | Optimize current image |
| POST | `/batch` | Start batch processing |
| DELETE | `/batch/:jobId` | Cancel running job |
| POST | `/upload` | Upload images |
| GET | `/download` | Download processed images |
| GET | `/settings` | Get settings |
| POST | `/settings` | Save settings |
| GET | `/progress` | Get batch progress |
| GET | `/logs` | Get processing logs |

### Backend Proxy Configuration

Add to `next.config.js`:

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/image-studio/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};
```

### Data Models

```typescript
interface SKU {
  id: string;
  article: string;
  status: 'not_generated' | 'main_generated' | 'done';
  isMainImage: boolean;
  isApproved: boolean;
  thumbnail: string;
  createdAt: string;
}

interface ImagePair {
  id: string;
  type: 'main' | 'secondary';
  original: Image;
  generated: Image | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  prompt?: string;
}

interface StudioSettings {
  apiBase: string;
  apiKey: string;
  model: string;
  targetWidth: number;
  targetHeight: number;
  temperature: number;
  resumeMode: boolean;
  continuousView: boolean;
  showFinalPrompt: boolean;
  prompts: PromptGroup;
}
```

### API Client

Location: `src/lib/api/image-studio.ts`

```typescript
export async function getSKUs(filters?: SKUFilters): Promise<SKU[]>
export async function getSKU(id: string): Promise<SKU>
export async function archiveSKUs(ids: string[]): Promise<void>
export async function getImagePairs(skuId: string): Promise<ImagePair[]>
export async function regenerateImage(options: RegenOptions): Promise<Image>
export async function optimizeImage(imageId: string, prompt: string): Promise<Image>
export async function startBatch(options: BatchOptions): Promise<string>
export async function cancelJob(jobId: string): Promise<void>
export async function getSettings(): Promise<StudioSettings>
export async function saveSettings(settings: StudioSettings): Promise<void>
export async function getProgress(): Promise<BatchProgress>
export async function getLogs(): Promise<LogEntry[]>
```

---

## 5. Styling Approach

### Strategy: Tailwind + Custom CSS Variables

Extract CSS variables from reference and add to `globals.css`. Use Tailwind for layout/spacing with custom component classes.

### CSS Variables to Add

```css
@layer base {
  :root {
    /* Image Studio Specific */
    --istudio-primary: #3a86ff;
    --istudio-primary-gradient: linear-gradient(135deg, #3a86ff 0%, #5fa8ff 100%);
    --istudio-secondary: #00d4ff;
    --istudio-secondary-gradient: linear-gradient(135deg, #00d4ff 0%, #5fa8ff 100%);
    --istudio-danger: #ff5c8d;
    --istudio-warning: #ffd166;
    --istudio-success: #06d6a0;

    /* Glass Effects */
    --istudio-glass-bg: rgba(255, 255, 255, 0.9);
    --istudio-glass-border: rgba(203, 213, 224, 0.4);

    /* Layout */
    --istudio-image-card-height: clamp(420px, 62vh, 760px);
    --istudio-sidebar-width: 320px;
    --istudio-header-height: 60px;
  }
}
```

### Custom Component Classes

```css
@layer components {
  /* Header */
  .istudio-header {
    @apply flex items-center justify-between gap-6 px-6;
    @apply bg-istudio-glass-bg backdrop-blur-xl;
    @apply border-b border-istudio-glass-border;
    height: var(--istudio-header-height);
  }

  /* Sidebar */
  .istudio-sidebar {
    @apply bg-white/98 backdrop-blur-xl;
    @apply border-r border-border;
    width: var(--istudio-sidebar-width);
  }

  /* Decorative Lines */
  .decor-line {
    @apply fixed z-0 pointer-events-none;
    @apply w-px h-full;
  }

  .decor-line-1 {
    @apply left-[20%];
    background: linear-gradient(to bottom, transparent, var(--istudio-primary), transparent);
  }

  .decor-line-2 {
    @apply right-[20%];
    background: linear-gradient(to bottom, transparent, var(--istudio-secondary), transparent);
  }

  /* Segmented Control */
  .segmented {
    @apply inline-flex bg-white/80 rounded-xl border border-border overflow-hidden;
  }

  .segmented-btn {
    @apply px-4 py-2 rounded-lg text-sm text-muted-foreground;
    @apply transition-all duration-200;
  }

  .segmented-btn.active {
    @apply bg-primary/10 text-primary border-primary/35;
    box-shadow: 0 0 10px rgba(58, 134, 255, 0.2);
  }

  /* SKU Item */
  .sku-item {
    @apply flex items-center p-3 rounded-lg mb-1.5 cursor-pointer;
    @apply transition-all duration-300 border border-transparent;
  }

  .sku-item:hover {
    @apply bg-muted/50;
  }

  .sku-item.selected {
    @apply bg-primary/5 border-primary/30;
  }

  /* Modal */
  .istudio-modal {
    @apply bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4;
  }

  .istudio-modal-mask {
    @apply fixed inset-0 bg-black/30 backdrop-blur-sm z-50;
  }

  /* Progress Bar */
  .batch-progress-bar {
    @apply h-2 bg-muted rounded-full overflow-hidden;
  }

  .batch-progress-bar-inner {
    @apply h-full bg-gradient-to-r from-primary to-secondary;
    @apply transition-all duration-300;
  }
}
```

### Key Design Tokens to Port

| Feature | Implementation |
|---------|---------------|
| Glass morphism | `backdrop-filter: blur(20px)` + semi-transparent backgrounds |
| Gradient text | `background-clip: text` + transparent color |
| Custom scrollbar | Webkit scrollbar styling |
| Modal mask | Blur overlay with `z-index: 50` |
| Decorative lines | Fixed position gradient lines at 20% from edges |
| Status badges | Color-coded by status (pending=gray, processing=blue, done=green, failed=red) |

---

## 6. Component Breakdown Details

### ImageStudioContainer

**Location:** `src/shared/blocks/image-studio/image-studio-container.tsx`

```typescript
interface ImageStudioContainerProps {
  locale: string;
}

// Responsibilities:
// - Render full layout with decorative lines
// - Provide ImageStudioContext
// - Handle keyboard shortcuts
// - Mount polling for real-time updates
```

### StudioHeader

**Location:** `src/shared/blocks/image-studio/header.tsx`

```typescript
interface StudioHeaderProps {
  activeTab: 'processing' | 'history';
  onTabChange: (tab: 'processing' | 'history') => void;
  proMode: boolean;
  onProModeToggle: () => void;
  onDownloadClick: () => void;
  onSettingsClick: () => void;
  onUploadClick: () => void;
}

// Renders:
// - Logo with gradient text
// - Segmented tabs (Processing | History)
// - Action buttons with icons
// - Live time display (updates every second)
```

### StudioSidebar

**Location:** `src/shared/blocks/image-studio/sidebar.tsx`

```typescript
interface StudioSidebarProps {
  skus: SKU[];
  selectedSKUs: Set<string>;
  searchQuery: string;
  filterStatus: string;
  onlyMainImages: boolean;
  onlyApproved: boolean;
  onSearchChange: (query: string) => void;
  onFilterChange: (status: string) => void;
  onOnlyMainToggle: () => void;
  onOnlyApprovedToggle: () => void;
  onSKUSelect: (id: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onArchiveClick: () => void;
}

// Renders:
// - Search box with magnifying glass icon
// - Bulk select pill buttons
// - Status filter dropdown
// - Virtual-scrollable SKU list
// - Archive footer with selection count
```

### StudioMainContent

**Location:** `src/shared/blocks/image-studio/main-content.tsx`

```typescript
interface StudioMainContentProps {
  currentSKU: SKU | null;
  imagePairs: ImagePair[];
  mode: 'continuous' | 'step-review';
  batchProgress: number;
  batchStats: BatchStats;
  isBatchRunning: boolean;
  onModeChange: (mode: 'continuous' | 'step-review') => void;
  onRefresh: () => void;
  onImageClick: (pair: ImagePair, type: 'original' | 'generated') => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
}

// Renders:
// - SKU title and subtitle
// - Mode tabs (Continuous | Step Review)
// - Force refresh button
// - Image pairs grid
// - Batch processing footer
```

### ImagePairCard

**Location:** `src/shared/blocks/image-studio/image-pair-card.tsx`

```typescript
interface ImagePairCardProps {
  pair: ImagePair;
  mode: 'continuous' | 'step-review';
  onOriginalClick: (pair: ImagePair) => void;
  onGeneratedClick: (pair: ImagePair) => void;
  onRegenerate: (pair: ImagePair) => void;
}

// Renders:
// - Side-by-side comparison (continuous mode)
// - Stacked comparison (step review mode)
// - Status badges
// - Hover overlay with action buttons
// - Loading spinner for processing state
```

### Modal Components

#### ImageOperationModal
```typescript
interface ImageOperationModalProps {
  image: Image;
  options: RegenOptions;
  onOptionsChange: (options: RegenOptions) => void;
  onRegenerate: () => void;
  onOptimize: () => void;
  onClose: () => void;
}
// Renders image preview + checkboxes for prompt options
```

#### ProgressModal
```typescript
interface ProgressModalProps {
  jobs: Job[];
  logs: string[];
  onCancel: () => void;
  onClose: () => void;
}
// Renders job list + live log output
```

#### DownloadModal
```typescript
interface DownloadModalProps {
  shops: Shop[];
  onStart: (shopId: string, articles: string[]) => void;
  onClose: () => void;
}
// Renders shop selector + article input textarea
```

#### SettingsModal
```typescript
interface SettingsModalProps {
  settings: StudioSettings;
  onChange: (settings: StudioSettings) => void;
  onSave: () => void;
  onClose: () => void;
}
// Renders tabbed interface (Basic | Prompt settings)
```

---

## 7. File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   └── (user)/
│   │       └── dashboard/
│   │           └── imagestudio/
│   │               └── page.tsx                    # Main page entry
│   │
│   ├── api/
│   │   └── image-studio/
│   │       ├── skus/
│   │       │   └── route.ts                       # GET/POST SKU list & archive
│   │       ├── pairs/
│   │       │   └── [skuId]/
│   │       │       └── route.ts                   # GET image pairs for SKU
│   │       ├── regenerate/
│   │       │   └── route.ts                       # POST regenerate image
│   │       ├── optimize/
│   │       │   └── route.ts                       # POST optimize current image
│   │       ├── batch/
│   │       │   └── route.ts                       # POST start batch, DELETE cancel
│   │       ├── upload/
│   │       │   └── route.ts                       # POST upload images
│   │       ├── download/
│   │       │   └── route.ts                       # GET download processed
│   │       ├── settings/
│   │       │   └── route.ts                       # GET/POST settings
│   │       ├── progress/
│   │       │   └── route.ts                       # GET batch progress
│   │       └── logs/
│   │           └── route.ts                       # GET processing logs
│   │
├── shared/
│   ├── blocks/
│   │   └── image-studio/
│   │       ├── index.tsx                          # Export all components
│   │       ├── image-studio-container.tsx         # Main wrapper
│   │       ├── header.tsx                         # Top header bar
│   │       ├── sidebar.tsx                        # Left sidebar
│   │       ├── main-content.tsx                   # Main work area
│   │       ├── sku-list.tsx                       # SKU list component
│   │       ├── sku-item.tsx                       # Single SKU item
│   │       ├── image-pair-card.tsx                # Before/after card
│   │       ├── batch-footer.tsx                   # Batch progress footer
│   │       ├── modals/
│   │       │   ├── index.tsx                      # Export all modals
│   │       │   ├── image-modal.tsx                # Image operations
│   │       │   ├── progress-modal.tsx             # Batch progress
│   │       │   ├── download-modal.tsx             # Download tool
│   │       │   ├── settings-modal.tsx             # Settings
│   │       │   └── opt-prompt-modal.tsx           # Optimize prompt
│   │       └── types.ts                           # TypeScript types
│   │
│   ├── contexts/
│   │   └── image-studio-context.tsx               # State management
│   │
│   └── hooks/
│       ├── use-image-studio.ts                    # Context hook
│       └── use-interval.ts                        # Polling hook
│
├── lib/
│   └── api/
│       └── image-studio.ts                        # API client functions
│
└── messages/
    └── en.json                                    # Add i18n strings
```

---

## 8. Implementation Considerations

### 8.1 Real-time Updates

**Polling Strategy:**

| Data Type | Poll Interval | Implementation |
|-----------|---------------|----------------|
| Batch Progress | 2 seconds | `useInterval` hook when `isBatchRunning` |
| Individual Image Status | 3 seconds | Poll only images in "processing" state |
| SKU List | Manual refresh | Refresh button + auto-refresh on actions |

```typescript
// Example polling hook
function useBatchProgress(isRunning: boolean) {
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<BatchStats>(defaultStats);

  useInterval(async () => {
    if (!isRunning) return;
    const data = await getProgress();
    setProgress(data.percent);
    setStats(data.stats);
  }, 2000);

  return { progress, stats };
}
```

### 8.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search box |
| `Escape` | Close active modal |
| `Arrow Up/Down` | Navigate SKU list |
| `Enter` | Open selected SKU |
| `Ctrl/Cmd + A` | Select all visible SKUs |
| `Ctrl/Cmd + D` | Toggle Pro Mode |
| `Space` | Toggle checkbox on focused SKU |

Implementation using `react-hotkeys-hook`:

```typescript
useHotkeys('ctrl+k', (e) => {
  e.preventDefault();
  searchRef.current?.focus();
});
```

### 8.3 Image Loading Optimization

| Technique | Implementation |
|-----------|----------------|
| Lazy Loading | `loading="lazy"` attribute on images |
| Thumbnails | Serve low-res thumbnails (200px) for SKU list |
| Progressive Load | Blur-up effect with small placeholder |
| Caching | Cache thumbnails in browser |

```typescript
// Blur-up example
<img
  src={thumbnail}
  style={{ filter: isLoading ? 'blur(10px)' : 'none' }}
  onLoad={() => setIsLoading(false)}
/>
```

### 8.4 Error Handling

**Retry Strategy:**
- API calls: 3 retry attempts with exponential backoff
- User notification: Toast for all errors
- Graceful degradation: Show cached data on failure

**Error Types:**

| Error | Handling |
|-------|----------|
| Network error | Retry 3x, show toast "Connection error" |
| Backend error | Show error message from response |
| Timeout | Show toast "Request timed out" |
| Validation | Show inline error on form field |

### 8.5 Accessibility

| Requirement | Implementation |
|-------------|----------------|
| ARIA labels | All buttons and inputs have `aria-label` |
| Keyboard nav | Full keyboard navigation throughout |
| Focus trap | Modals trap focus within modal |
| Screen reader | Announcements for status changes |
| Color contrast | WCAG AA compliant (4.5:1) |

```typescript
// Example accessible button
<button
  aria-label="Download processed images"
  aria-pressed={isDownloading}
>
  <DownloadIcon />
  <span>Download</span>
</button>
```

### 8.6 Performance

| Optimization | Implementation |
|--------------|----------------|
| Virtual Scroll | `react-window` for SKU list (100+ items) |
| Debounced Search | 300ms delay on search input |
| Memoization | `useMemo` for filtered/sorted lists |
| Code Splitting | Dynamic imports for modals |

```typescript
// Virtual scrolling example
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={skus.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => <SKUItem sku={skus[index]} style={style} />}
</FixedSizeList>
```

### 8.7 Testing Considerations

| Test Type | Coverage Goal |
|-----------|---------------|
| Unit Tests | 80% for hooks and utilities |
| Component Tests | All modal variants, main flows |
| E2E Tests | Critical user journeys |
| Accessibility | Axe-core scans |

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create file structure
- [ ] Set up API proxy in `next.config.js`
- [ ] Create TypeScript types
- [ ] Set up ImageStudio Context
- [ ] Add CSS variables to `globals.css`

### Phase 2: Core Components
- [ ] ImageStudioContainer with layout
- [ ] StudioHeader
- [ ] StudioSidebar with SKU list
- [ ] StudioMainContent with image grid
- [ ] BatchFooter

### Phase 3: Modals
- [ ] ImageOperationModal
- [ ] ProgressModal
- [ ] DownloadModal
- [ ] SettingsModal
- [ ] OptPromptModal

### Phase 4: API Integration
- [ ] Create API routes
- [ ] Implement API client
- [ ] Connect components to backend
- [ ] Add polling for updates

### Phase 5: Polish
- [ ] Add keyboard shortcuts
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Reference Materials

- **Reference HTML:** `dev/ozon-backen/demo2/web/index.html`
- **Reference CSS:** `dev/ozon-backen/demo2/web/assets/app.css`
- **Backend API:** `dev/ozon-backen/demo2/` (Python/FastAPI)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-20
