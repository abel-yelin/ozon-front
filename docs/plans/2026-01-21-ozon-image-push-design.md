# Ozon Image Push API Integration Design

**Date**: 2026-01-21
**Author**: Claude Code
**Status**: Design

## Overview

Integrate Ozon Seller API to push processed images from ImageStudio to Ozon product listings, replacing existing product images.

## Background

ImageStudio processes product images and stores them in R2 with public URLs. The "Upload" button in TopBar (`openModal('upload')`) currently has no implementation. This design adds functionality to push these R2 URLs to Ozon via the Seller API.

## Requirements

1. **Goal**: Batch replace product images on Ozon
2. **API**: Ozon Seller API `/v1/product/pictures` endpoint
3. **Image Source**: R2 public URLs (already available)
4. **Product ID**: Provided directly by frontend
5. **Scope**: Support `images`, `images360`, and `color_image` fields

## Architecture

### Backend Components

```
app/plugins/ozon/
├── client.py          # Extend: add update_product_pictures()
├── image_push.py      # New: OzonImagePushPlugin
└── __init__.py

app/api/v1/
└── ozon.py            # Extend: add /push-images route
```

### Frontend Components

```
src/shared/blocks/image-studio/components/modals/
└── UploadModal.tsx    # New: Push images modal dialog
```

## API Design

### Request

```
POST /api/v1/ozon/push-images

{
  "credential": {
    "client_id": "string",
    "api_key": "string"
  },
  "product_id": 123456,
  "images": ["https://r2.com/img1.jpg", ...],
  "images360": ["https://r2.com/360_1.jpg", ...],
  "color_image": "https://r2.com/color.jpg"
}
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "product_id": 123456,
    "updated": {
      "images": 5,
      "images360": 0,
      "color_image": true
    },
    "current_images": ["url1", "url2", ...]
  }
}
```

### Response (Partial Failure)

```json
{
  "success": false,
  "data": {
    "product_id": 123456,
    "updated": { "images": 3, "images360": 0, "color_image": false }
  },
  "errors": [
    { "field": "images", "index": 2, "url": "...", "reason": "Invalid URL format" },
    { "field": "images360", "reason": "Exceeds limit (70)" }
  ]
}
```

## Implementation Flow

```
1. Frontend Request
   ├── product_id
   ├── images / images360 / color_image (R2 URLs)
   └── credential (client_id + api_key)

2. Backend Validation
   ├── URL format check (must start with http/https)
   ├── Quantity limits (images ≤30, images360 ≤70)
   └── Null value filtering

3. Call Ozon Update API
   POST /v1/product/pictures

4. Confirm Update Result
   GET /v2/product/pictures/info (query product images)
   Compare before/after to verify actual update count

5. Return Response
   ├── success: true/false
   ├── data: { product_id, updated_counts, current_images }
   └── errors: [] (if any failures)
```

## OzonClient Extension

Add to `app/plugins/ozon/client.py`:

```python
async def update_product_pictures(
    self,
    product_id: int,
    images: Optional[List[str]] = None,
    images360: Optional[List[str]] = None,
    color_image: Optional[str] = None
) -> dict:
    """
    Update product images on Ozon.

    Args:
        product_id: Ozon product ID
        images: Main image URLs (max 30)
        images360: 360° image URLs (max 70)
        color_image: Marketing color image URL

    Returns:
        Ozon API response
    """
    payload = {"product_id": product_id}
    if images is not None:
        payload["images"] = images[:30]
    if images360 is not None:
        payload["images360"] = images360[:70]
    if color_image is not None:
        payload["color_image"] = color_image

    return await self._post("/v1/product/pictures", payload)
```

## OzonImagePushPlugin

New file `app/plugins/ozon/image_push.py`:

```python
class OzonImagePushPlugin:
    def __init__(self, config: dict):
        self.config = config

    async def push_images(self, context: dict) -> dict:
        """Main entry point for image push operation."""
        # 1. Validate input
        validation = self._validate(context)
        if validation["errors"]:
            return {"success": False, "errors": validation["errors"]}

        # 2. Call Ozon API to update
        client = OzonClient(
            context["credential"]["client_id"],
            context["credential"]["api_key"]
        )
        update_result = await client.update_product_pictures(
            context["product_id"],
            images=context.get("images") or None,
            images360=context.get("images360") or None,
            color_image=context.get("color_image")
        )

        # 3. Confirm result
        current_urls = await client.get_picture_urls(context["product_id"])

        # 4. Build response
        return self._build_response(update_result, current_urls, context)

    def _validate(self, context: dict) -> dict:
        """Validate input URLs and quantities."""
        errors = []

        # URL format validation
        for field in ["images", "images360"]:
            urls = context.get(field, [])
            for i, url in enumerate(urls):
                if not url.startswith(("http://", "https://")):
                    errors.append({
                        "field": field,
                        "index": i,
                        "url": url,
                        "reason": "Invalid URL format"
                    })

        # Quantity limits
        if len(context.get("images", [])) > 30:
            errors.append({"field": "images", "reason": "Exceeds limit (30)"})
        if len(context.get("images360", [])) > 70:
            errors.append({"field": "images360", "reason": "Exceeds limit (70)"})

        return {"errors": errors}

    def _build_response(self, update_result: dict, current_urls: list, context: dict) -> dict:
        """Build standardized response."""
        product_id = context["product_id"]
        images_count = len(context.get("images", []))
        images360_count = len(context.get("images360", []))
        has_color = context.get("color_image") is not None

        return {
            "success": True,
            "data": {
                "product_id": product_id,
                "updated": {
                    "images": images_count,
                    "images360": images360_count,
                    "color_image": has_color
                },
                "current_images": current_urls
            }
        }
```

## API Route

Add to `app/api/v1/ozon.py`:

```python
class PushImagesRequest(BaseModel):
    credential: OzonCredential
    product_id: int = Field(..., gt=0, description="Ozon Product ID")
    images: Optional[List[str]] = Field(None, max_length=30)
    images360: Optional[List[str]] = Field(None, max_length=70)
    color_image: Optional[str] = None

@router.post("/push-images")
async def push_product_images(
    request: PushImagesRequest,
    authorized: bool = Depends(verify_api_key)
):
    """
    Push processed images to Ozon product, replacing existing images.

    Flow:
    1. Validate input
    2. Call Ozon API to update
    3. Confirm update result
    4. Return summary
    """
    plugin = OzonImagePushPlugin({})
    result = await plugin.push_images({
        "credential": request.credential.dict(),
        "product_id": request.product_id,
        "images": request.images or [],
        "images360": request.images360 or [],
        "color_image": request.color_image
    })

    return JSONResponse(content=result)
```

## Frontend Integration

### UploadModal Component

New file `src/shared/blocks/image-studio/components/modals/UploadModal.tsx`:

```tsx
interface PushImagesRequest {
  credential: { client_id: string; api_key: string };
  product_id: number;
  images: string[];
  images360?: string[];
  color_image?: string;
}

export function UploadModal() {
  const { modal, currentSKU, processedImages } = useImageStudio();
  const [pushing, setPushing] = useState(false);

  const handlePush = async () => {
    setPushing(true);

    try {
      // 1. Get credential from context/storage
      const credential = await getOzonCredential();

      // 2. Build R2 URL list from processedImages
      const images = processedImages.map(img => img.r2Url);

      // 3. Get product_id from currentSKU or user input
      const product_id = currentSKU?.productId ||
                         await promptUserForProductId();

      // 4. Call backend API
      const response = await fetch('/api/v1/ozon/push-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, product_id, images })
      });

      // 5. Show result
      const result = await response.json();
      showResultModal(result);
    } finally {
      setPushing(false);
    }
  };

  const isOpen = modal.type === 'upload';

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>推送图片到 Ozon</DialogTitle>
        </DialogHeader>

        {/* Image preview */}
        <div className="grid grid-cols-4 gap-2">
          {processedImages.map(img => (
            <img key={img.id} src={img.r2Url} alt="" />
          ))}
        </div>

        {/* SKU info */}
        <div className="text-sm">
          <p>SKU: {currentSKU?.name}</p>
          <p>Product ID: {currentSKU?.productId || '未设置'}</p>
        </div>

        <Button onClick={handlePush} disabled={pushing}>
          {pushing ? '推送中...' : '确认推送'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

## Error Handling

| Error Type | HTTP Status | Response |
|------------|-------------|----------|
| Validation failed | 400 | `{"success": false, "errors": [...]}` |
| Ozon API 403 | 403 | `{"success": false, "error": "API key unauthorized"}` |
| Ozon API 404 | 404 | `{"success": false, "error": "Product not found"}` |
| Ozon API 409 | 409 | `{"success": false, "error": "Product status conflict"}` |
| Network timeout | 504 | `{"success": false, "error": "Ozon API timeout"}` |

## Configuration

Add to `app/core/config.py`:

```python
class Settings(BaseSettings):
    # Ozon push configuration
    ozon_push_timeout: int = 30
    ozon_push_max_retries: int = 2
    ozon_push_validate_urls: bool = True
```

## Testing Plan

| Scenario | Verification |
|----------|--------------|
| Normal push | Successfully updates images array |
| Empty images | Field not sent (preserves original) |
| >30 images | Automatically truncated to 30 |
| Invalid URL | Returns detailed error report |
| Non-existent product_id | Returns 404 error |
| Unauthorized API key | Returns 403 error |
| Network timeout | Retry then return timeout error |

## Security Considerations

- API credentials passed from frontend, not stored by backend (consistent with existing /ozon/download)
- URL validation prevents injection attacks
- Request timeout prevents blocking

## Data Flow Summary

```
ImageStudio processing complete → Images stored in R2 →
User clicks "Upload" button → UploadModal opens →
Collect R2 URLs + Product ID →
POST /api/v1/ozon/push-images →
Backend validates → Calls Ozon API →
Confirms result → Returns summary →
Frontend displays result
```
