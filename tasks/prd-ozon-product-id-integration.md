# PRD: Ozon Product ID Integration for Image Studio Push Feature

## Introduction

Currently, when users try to push processed images to Ozon via ImageStudio, they encounter the error "未找到 Product ID，请先下载商品信息" (Product ID not found, please download product info first). This occurs because the `productId` field in SKU objects is empty, even though the product information was downloaded from Ozon.

This PRD implements **Solution 1** to fix the data flow from Ozon download → Gallery → ImageStudio SKU, ensuring that `productId` is automatically captured and available for push operations.

## Goals

- Automatically capture and store `productId` when downloading products from Ozon
- Display `productId` status in ImageStudio UploadModal for user visibility
- Provide clear navigation to download page when `productId` is missing
- Maintain backward compatibility - old data without `productId` continues to work
- Implement friendly error messages instead of blocking users

## User Stories

### US-001: Extend GalleryImage type to include productId
**Description:** As a developer, I need to extend the `GalleryImage` type to include the `productId` field so that product information from Ozon downloads is preserved throughout the data pipeline.

**Acceptance Criteria:**
- [ ] Add optional `productId?: number` field to `GalleryImage` type in `src/shared/services/gallery.ts`
- [ ] Update TypeScript compilation to verify no type errors
- [ ] Ensure backward compatibility with existing code that reads GalleryImage

### US-002: Extract productId from Ozon download results
**Description:** As a system, I need to extract `productId` from Ozon download task results when building gallery images so that the product ID is available for downstream operations.

**Acceptance Criteria:**
- [ ] Modify `getUserGalleryImages()` function in `src/shared/services/gallery.ts`
- [ ] Extract `item.product_id` from each OzonDownloadItem in task results
- [ ] Store `productId` in returned GalleryImage objects
- [ ] Handle cases where `product_id` is undefined (gracefully skip)
- [ ] Typecheck passes

### US-003: Propagate productId to SKU objects
**Description:** As ImageStudio, I need to include `productId` when building SKU objects from gallery data so that users can push images to the correct Ozon product.

**Acceptance Criteria:**
- [ ] Modify `GET /api/image-studio/folders` route in `src/app/api/image-studio/folders/route.ts`
- [ ] Extract `productId` from GalleryImage when grouping by article
- [ ] Include `productId` in the returned SKU object
- [ ] Handle multiple images with different productIds for same article (use first non-null value)
- [ ] Typecheck passes
- [ ] Verify SKU objects contain productId in browser console

### US-004: Display productId status in UploadModal
**Description:** As a user, I want to see whether the current SKU has a Product ID in the UploadModal so I know if the push will succeed or if I need to download product info first.

**Acceptance Criteria:**
- [ ] Update `UploadModal.tsx` to display Product ID status in current SKU info section
- [ ] Show Product ID value when present (e.g., "Product ID: 123456")
- [ ] Show "未设置" (not set) when productId is null/undefined
- [ ] Visual distinction: use different styling for present vs missing productId
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Add navigation link to Ozon download page
**Description:** As a user, when productId is missing, I want a quick link to the Ozon download page so I can easily download the product info without leaving the workflow.

**Acceptance Criteria:**
- [ ] Add "下载商品信息" link in UploadModal when productId is missing
- [ ] Link opens `/dashboard/ozon` in new tab
- [ ] Link only appears when `currentSKU.productId` is null/undefined
- [ ] Use clear, user-friendly button/link styling
- [ ] Typecheck passes
- [ ] Verify link functionality in browser

### US-006: Improve error messages for missing productId
**Description:** As a user, when I try to push without a productId, I want a friendly error message explaining what to do instead of a generic error.

**Acceptance Criteria:**
- [ ] Update push error message to: "未找到 Product ID，请先在 [Ozon 下载页面] 获取商品信息"
- [ ] Include clickable link to `/dashboard/ozon` in error message
- [ ] For batch push: skip items without productId and show summary
- [ ] For single push: show clear error with action link
- [ ] Typecheck passes
- [ ] Verify error messages in browser

## Functional Requirements

### Data Flow
- FR-1: `GalleryImage` type must include optional `productId?: number` field
- FR-2: `getUserGalleryImages()` must extract `product_id` from Ozon task results
- FR-3: SKU builder must map `productId` from gallery images to SKU objects
- FR-4: Backward compatibility: existing code works without productId

### UploadModal Behavior
- FR-5: Display current SKU's productId status in the modal
- FR-6: Show actual Product ID value when present (e.g., "123456")
- FR-7: Show "未设置" (not set) when productId is missing
- FR-8: Provide navigation link to `/dashboard/ozon` when productId is missing

### Push Operation Error Handling
- FR-9: Single push: Block operation with friendly error + link when productId missing
- FR-10: Batch push: Skip items without productId, continue with valid items
- FR-11: Error messages must include clickable link to download page
- FR-12: Show count of skipped items in batch push results

### Legacy Data Handling
- FR-13: Old gallery images without productId continue to display normally
- FR-14: Old SKUs without productId show "未设置" in UploadModal
- FR-15: No automatic migration or forced re-download for old data

## Non-Goals (Out of Scope)

- **No automatic data migration** for existing gallery images without productId
- **No forced re-download** of product info for old data
- **No manual productId association** feature in ImageStudio
- **No bulk editing** of productId for multiple SKUs
- **No productId validation** against Ozon API (trust downloaded data)
- **No automatic retry** or background sync for missing productIds
- **No productId search** or lookup by article number

## Design Considerations

### UI Components to Reuse
- Badge component for productId status display
- Link component for navigation to download page
- Alert/Error message components for push failures

### Visual Design
- **With productId**: Green checkmark + numeric display (e.g., "✓ Product ID: 123456")
- **Without productId**: Amber warning + link (e.g., "⚠ Product ID: 未设置 [下载商品信息]")
- **Error message**: Clear action-oriented text with clickable link

### UploadModal Layout
```
┌─────────────────────────────────────┐
│ 推送图片到 Ozon                      │
├─────────────────────────────────────┤
│                                     │
│ 当前商品                             │
│ SKU: ABC123                         │
│ Product ID: 123456  ✓ (or "未设置")  │
│ [下载商品信息] ← only when missing   │
│                                     │
│ 待推送图片 (3 张)                    │
│ ...                                 │
└─────────────────────────────────────┘
```

## Technical Considerations

### Data Structure Changes
```typescript
// Before
export type GalleryImage = {
  url: string;
  article: string;
  taskId: string;
  createdAt: string;
};

// After
export type GalleryImage = {
  url: string;
  article: string;
  taskId: string;
  createdAt: string;
  productId?: number;  // NEW FIELD
};
```

### Migration Strategy
- No database migration required (field is optional)
- Old data remains unchanged (productId is undefined)
- New downloads will include productId automatically
- Gradual rollout - users re-download as needed

### Error Handling Strategy
```typescript
// Single push
if (!currentSKU.productId) {
  return {
    success: false,
    error: '未找到 Product ID，请先在<a href="/dashboard/ozon">Ozon 下载页面</a>获取商品信息'
  };
}

// Batch push
const validItems = items.filter(item => item.productId);
const skippedItems = items.filter(item => !item.productId);
```

### Type Safety
- All new code must pass TypeScript strict mode
- Optional chaining (`productId?.`) for safe access
- Null checks before push operations

## Success Metrics

### Primary Metrics
- **Error reduction**: 90% of push attempts have productId available (for new downloads)
- **User navigation**: 60% of users with missing productId click the download link
- **Task completion**: Push success rate increases from 0% to >95% for users with downloaded products

### Secondary Metrics
- **User feedback**: Decrease in support tickets related to "Product ID not found"
- **Adoption**: Users re-download old products at their own pace
- **Error clarity**: Users understand what to do when productId is missing

## Open Questions

1. **Q:** Should we add a "Last downloaded" timestamp to show how fresh the product info is?
   - **A:** Out of scope for this PRD - can be added later

2. **Q:** What if Ozon API changes and stops returning `product_id`?
   - **A:** Gracefully handle undefined - show error message as designed

3. **Q:** Should we log analytics for how often users encounter missing productId?
   - **A:** Out of scope - can be added later for monitoring

4. **Q:** Can a SKU have images from multiple Ozon products with different productIds?
   - **A:** Yes, use first non-null productId (document this behavior)

5. **Q:** Should we show productId in the SKU list view (sidebar)?
   - **A:** Out of scope - only show in UploadModal for now

## Implementation Notes

### File Changes Summary
1. **src/shared/services/gallery.ts** - Add productId to GalleryImage type, update getUserGalleryImages()
2. **src/app/api/image-studio/folders/route.ts** - Map productId to SKU objects
3. **src/shared/blocks/image-studio/components/modals/UploadModal.tsx** - Display productId status and navigation link
4. **src/lib/api/image-studio.ts** - Update fetchSKUs to include productId (if needed)

### Testing Strategy
- Unit tests for getUserGalleryImages with mock data including/excluding productId
- Integration test for SKU building with productId
- Manual browser testing for UploadModal UI changes
- Regression testing for old data (without productId)

### Rollout Plan
1. Deploy backend changes (type definitions, data extraction)
2. Deploy frontend changes (UploadModal UI)
3. Monitor for TypeScript errors
4. Gather user feedback on error message clarity
