# Ozon Image Push Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add functionality to push ImageStudio-processed images to Ozon product listings via the Ozon Seller API, replacing existing product images.

**Architecture:** Backend API route (`/api/v1/ozon/push-images`) receives R2 image URLs and product ID, validates input, calls Ozon's `/v1/product/pictures` endpoint, confirms the update, and returns a summary. Frontend UploadModal component collects processed images and product info, then displays push results.

**Tech Stack:** Python (FastAPI, aiohttp), TypeScript (React), Ozon Seller API, R2 Storage

---

## Task 1: Add OzonClient.update_product_pictures() Method

**Files:**
- Modify: `dev/ozon-backen/app/plugins/ozon/client.py`
- Test: `dev/ozon-backen/tests/plugins/ozon/test_client.py` (create if not exists)

**Step 1: Write the failing test**

Create test file `dev/ozon-backen/tests/plugins/ozon/test_client.py`:

```python
import pytest
from app.plugins.ozon.client import OzonClient

@pytest.mark.asyncio
async def test_update_product_pictures_builds_correct_payload(mocker):
    """Test that update_product_pictures builds the correct API payload."""
    client = OzonClient("test_client_id", "test_api_key")

    # Mock the _post method to capture the payload
    mock_post = mocker.patch.object(client, '_post', return_value={"result": "ok"})

    await client.update_product_pictures(
        product_id=123456,
        images=["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"],
        images360=["https://r2.com/360_1.jpg"],
        color_image="https://r2.com/color.jpg"
    )

    # Verify _post was called with correct endpoint and payload
    mock_post.assert_called_once_with("/v1/product/pictures", {
        "product_id": 123456,
        "images": ["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"],
        "images360": ["https://r2.com/360_1.jpg"],
        "color_image": "https://r2.com/color.jpg"
    })

@pytest.mark.asyncio
async def test_update_product_pictures_truncates_arrays(mocker):
    """Test that images array is truncated to 30 and images360 to 70."""
    client = OzonClient("test_client_id", "test_api_key")
    mock_post = mocker.patch.object(client, '_post', return_value={"result": "ok"})

    # Create arrays exceeding limits
    images_40 = [f"https://r2.com/img{i}.jpg" for i in range(40)]
    images360_80 = [f"https://r2.com/360_{i}.jpg" for i in range(80)]

    await client.update_product_pictures(
        product_id=123456,
        images=images_40,
        images360=images360_80
    )

    call_args = mock_post.call_args
    payload = call_args[0][1]

    # Verify truncation
    assert len(payload["images"]) == 30
    assert len(payload["images360"]) == 70
    assert payload["images"] == images_40[:30]
    assert payload["images360"] == images360_80[:70]

@pytest.mark.asyncio
async def test_update_product_pictures_omits_none_values(mocker):
    """Test that None values are not included in the payload."""
    client = OzonClient("test_client_id", "test_api_key")
    mock_post = mocker.patch.object(client, '_post', return_value={"result": "ok"})

    await client.update_product_pictures(
        product_id=123456,
        images=None,
        images360=None,
        color_image=None
    )

    call_args = mock_post.call_args
    payload = call_args[0][1]

    # Only product_id should be in payload
    assert payload == {"product_id": 123456}
    assert "images" not in payload
    assert "images360" not in payload
    assert "color_image" not in payload
```

**Step 2: Run test to verify it fails**

Run: `cd dev/ozon-backen && python -m pytest tests/plugins/ozon/test_client.py -v`

Expected: `AttributeError: 'OzonClient' object has no attribute 'update_product_pictures'` or similar

**Step 3: Write minimal implementation**

Add to `dev/ozon-backen/app/plugins/ozon/client.py` at the end of the `OzonClient` class (before the `close` method):

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

        Replaces all existing images for a product with the provided URLs.
        The first image in the array becomes the primary image.

        Args:
            product_id: Ozon product ID
            images: Main image URLs (max 30, will be truncated)
            images360: 360° image URLs (max 70, will be truncated)
            color_image: Marketing color image URL

        Returns:
            Ozon API response dict

        Raises:
            Exception: If API call fails
        """
        payload = {"product_id": product_id}

        # Add images if provided (truncate to 30)
        if images is not None:
            payload["images"] = images[:30]

        # Add images360 if provided (truncate to 70)
        if images360 is not None:
            payload["images360"] = images360[:70]

        # Add color_image if provided
        if color_image is not None:
            payload["color_image"] = color_image

        return await self._post("/v1/product/pictures", payload)
```

**Step 4: Run test to verify it passes**

Run: `cd dev/ozon-backen && python -m pytest tests/plugins/ozon/test_client.py -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
cd H:/Web/ozon-front
git add dev/ozon-backen/app/plugins/ozon/client.py dev/ozon-backen/tests/plugins/ozon/test_client.py
git commit -m "feat(ozon): add update_product_pictures method to OzonClient

Add method to push image updates to Ozon Seller API.
- Supports images (max 30), images360 (max 70), color_image
- Automatically truncates arrays to API limits
- Omits None values from payload

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create OzonImagePushPlugin with Validation

**Files:**
- Create: `dev/ozon-backen/app/plugins/ozon/image_push.py`
- Test: `dev/ozon-backen/tests/plugins/ozon/test_image_push.py`

**Step 1: Write the failing test**

Create `dev/ozon-backen/tests/plugins/ozon/test_image_push.py`:

```python
import pytest
from app.plugins.ozon.image_push import OzonImagePushPlugin

@pytest.mark.asyncio
async def test_validate_rejects_invalid_url_format():
    """Test that validation catches URLs not starting with http/https."""
    plugin = OzonImagePushPlugin({})

    context = {
        "product_id": 123456,
        "images": ["https://valid.com/img.jpg", "invalid-url", "ftp://bad.com/img.jpg"],
        "images360": [],
        "color_image": None
    }

    result = plugin._validate(context)

    assert len(result["errors"]) == 2
    assert result["errors"][0] == {
        "field": "images",
        "index": 1,
        "url": "invalid-url",
        "reason": "Invalid URL format"
    }
    assert result["errors"][1] == {
        "field": "images",
        "index": 2,
        "url": "ftp://bad.com/img.jpg",
        "reason": "Invalid URL format"
    }

@pytest.mark.asyncio
async def test_validate_rejects_exceeded_limits():
    """Test that validation catches array size exceeding limits."""
    plugin = OzonImagePushPlugin({})

    # Create arrays exceeding limits
    images_35 = [f"https://r2.com/img{i}.jpg" for i in range(35)]
    images360_75 = [f"https://r2.com/360_{i}.jpg" for i in range(75)]

    context = {
        "product_id": 123456,
        "images": images_35,
        "images360": images360_75,
        "color_image": None
    }

    result = plugin._validate(context)

    assert len(result["errors"]) == 2
    error_fields = {e["field"] for e in result["errors"]}
    assert "images" in error_fields
    assert "images360" in error_fields

@pytest.mark.asyncio
async def test_validate_passes_with_valid_input():
    """Test that validation passes with correct input."""
    plugin = OzonImagePushPlugin({})

    context = {
        "product_id": 123456,
        "images": ["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"],
        "images360": ["https://r2.com/360_1.jpg"],
        "color_image": "https://r2.com/color.jpg"
    }

    result = plugin._validate(context)

    assert result["errors"] == []

@pytest.mark.asyncio
async def test_build_response():
    """Test response building logic."""
    plugin = OzonImagePushPlugin({})

    update_result = {"result": "ok"}
    current_urls = ["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"]
    context = {
        "product_id": 123456,
        "images": ["url1", "url2", "url3"],
        "images360": ["360_1"],
        "color_image": "color_url"
    }

    result = plugin._build_response(update_result, current_urls, context)

    assert result["success"] == True
    assert result["data"]["product_id"] == 123456
    assert result["data"]["updated"]["images"] == 3
    assert result["data"]["updated"]["images360"] == 1
    assert result["data"]["updated"]["color_image"] == True
    assert result["data"]["current_images"] == current_urls
```

**Step 2: Run test to verify it fails**

Run: `cd dev/ozon-backen && python -m pytest tests/plugins/ozon/test_image_push.py -v`

Expected: `ModuleNotFoundError: No module named 'app.plugins.ozon.image_push'`

**Step 3: Write minimal implementation**

Create `dev/ozon-backen/app/plugins/ozon/image_push.py`:

```python
"""Ozon image push plugin for updating product pictures."""

from typing import Optional, List, Dict, Any
import logging

from app.plugins.ozon.client import OzonClient

logger = logging.getLogger(__name__)


class OzonImagePushPlugin:
    """Plugin for pushing images to Ozon product listings."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the plugin.

        Args:
            config: Plugin configuration dict
        """
        self.config = config

    async def push_images(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Push images to Ozon product.

        Main entry point for image push operation.

        Args:
            context: Dict containing:
                - credential: {client_id, api_key}
                - product_id: int
                - images: List[str] (optional)
                - images360: List[str] (optional)
                - color_image: str (optional)

        Returns:
            Dict with success status and data/errors
        """
        # Step 1: Validate input
        validation = self._validate(context)
        if validation["errors"]:
            return {"success": False, "errors": validation["errors"]}

        try:
            # Step 2: Create Ozon client
            credential = context.get("credential", {})
            client = OzonClient(
                credential.get("client_id", ""),
                credential.get("api_key", "")
            )

            # Step 3: Call Ozon API to update
            update_result = await client.update_product_pictures(
                context["product_id"],
                images=context.get("images") or None,
                images360=context.get("images360") or None,
                color_image=context.get("color_image")
            )

            # Check for API errors
            if update_result.get("error") or update_result.get("errors"):
                error_msg = update_result.get("error") or str(update_result.get("errors"))
                logger.error(f"Ozon API error: {error_msg}")
                return {
                    "success": False,
                    "error": f"Ozon API error: {error_msg}"
                }

            # Step 4: Confirm result by fetching current images
            current_urls = await client.get_picture_urls(context["product_id"])

            # Step 5: Build response
            return self._build_response(update_result, current_urls, context)

        except Exception as e:
            logger.error(f"Error in push_images: {e}")
            return {"success": False, "error": str(e)}

    def _validate(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate input URLs and quantities.

        Args:
            context: Input context dict

        Returns:
            Dict with "errors" list (empty if valid)
        """
        errors = []

        # URL format validation for images array
        for field in ["images", "images360"]:
            urls = context.get(field, [])
            for i, url in enumerate(urls):
                if not isinstance(url, str):
                    errors.append({
                        "field": field,
                        "index": i,
                        "url": str(url),
                        "reason": "Invalid URL format"
                    })
                    continue
                if not url.startswith(("http://", "https://")):
                    errors.append({
                        "field": field,
                        "index": i,
                        "url": url,
                        "reason": "Invalid URL format"
                    })

        # Quantity limits validation
        images = context.get("images", [])
        if len(images) > 30:
            errors.append({
                "field": "images",
                "reason": "Exceeds limit (30)"
            })

        images360 = context.get("images360", [])
        if len(images360) > 70:
            errors.append({
                "field": "images360",
                "reason": "Exceeds limit (70)"
            })

        return {"errors": errors}

    def _build_response(
        self,
        update_result: Dict[str, Any],
        current_urls: List[str],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build standardized response.

        Args:
            update_result: Raw Ozon API response
            current_urls: Current image URLs from Ozon
            context: Original input context

        Returns:
            Standardized response dict
        """
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

**Step 4: Run test to verify it passes**

Run: `cd dev/ozon-backen && python -m pytest tests/plugins/ozon/test_image_push.py -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
cd H:/Web/ozon-front
git add dev/ozon-backen/app/plugins/ozon/image_push.py dev/ozon-backen/tests/plugins/ozon/test_image_push.py
git commit -m "feat(ozon): add OzonImagePushPlugin for image push validation

Create plugin with:
- URL format validation (http/https)
- Quantity limits (images ≤30, images360 ≤70)
- Ozon API integration
- Response building with confirmation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add API Route for Image Push

**Files:**
- Modify: `dev/ozon-backen/app/api/v1/ozon.py`
- Test: `dev/ozon-backen/tests/api/v1/test_ozon.py` (create if not exists)

**Step 1: Write the failing test**

Create `dev/ozon-backen/tests/api/v1/test_ozon.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_push_images_requires_api_key():
    """Test that /push-images endpoint requires API key authentication."""
    response = client.post("/api/v1/ozon/push-images", json={
        "credential": {"client_id": "test", "api_key": "test"},
        "product_id": 123456,
        "images": ["https://r2.com/img.jpg"]
    })

    # Should fail without proper auth
    assert response.status_code in [401, 403]

def test_push_images_validates_product_id():
    """Test that product_id must be positive."""
    # This test assumes the API key is handled properly
    # For now, we'll test the validation at the model level
    from pydantic import ValidationError
    from app.api.v1.ozon import PushImagesRequest

    with pytest.raises(ValidationError):
        PushImagesRequest(
            credential={"client_id": "test", "api_key": "test"},
            product_id=-1,
            images=["https://r2.com/img.jpg"]
        )

def test_push_images_validates_array_lengths():
    """Test that array lengths are validated by Pydantic."""
    from pydantic import ValidationError
    from app.api.v1.ozon import PushImagesRequest

    # Test images > 30
    with pytest.raises(ValidationError):
        PushImagesRequest(
            credential={"client_id": "test", "api_key": "test"},
            product_id=123456,
            images=[f"https://r2.com/img{i}.jpg" for i in range(31)]
        )

    # Test images360 > 70
    with pytest.raises(ValidationError):
        PushImagesRequest(
            credential={"client_id": "test", "api_key": "test"},
            product_id=123456,
            images360=[f"https://r2.com/360_{i}.jpg" for i in range(71)]
        )

@pytest.mark.asyncio
async def test_push_images_integration(mocker):
    """Test full integration with mocked Ozon API."""
    from app.api.v1.ozon import push_product_images
    from app.api.v1.ozon import PushImagesRequest

    # Mock the plugin
    mock_plugin = mocker.patch('app.api.v1.ozon.OzonImagePushPlugin')
    mock_instance = mock_plugin.return_value
    mock_instance.push_images.return_value = {
        "success": True,
        "data": {
            "product_id": 123456,
            "updated": {"images": 2, "images360": 0, "color_image": False},
            "current_images": ["url1", "url2"]
        }
    }

    request = PushImagesRequest(
        credential={"client_id": "test", "api_key": "test"},
        product_id=123456,
        images=["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"]
    )

    result = await push_product_images(request, authorized=True)

    assert result["success"] == True
    assert result["data"]["product_id"] == 123456
    assert result["data"]["updated"]["images"] == 2
```

**Step 2: Run test to verify it fails**

Run: `cd dev/ozon-backen && python -m pytest tests/api/v1/test_ozon.py -v`

Expected: Various import/function not found errors

**Step 3: Write minimal implementation**

Add to `dev/ozon-backen/app/api/v1/ozon.py` after the existing imports and before the router definition:

```python
from typing import Optional
from fastapi.responses import JSONResponse
from app.plugins.ozon.image_push import OzonImagePushPlugin
```

Add after the `DownloadResponse` class:

```python
class PushImagesRequest(BaseModel):
    """Request model for pushing images to Ozon"""
    credential: OzonCredential
    product_id: int = Field(..., gt=0, description="Ozon Product ID")
    images: Optional[List[str]] = Field(None, max_length=30)
    images360: Optional[List[str]] = Field(None, max_length=70)
    color_image: Optional[str] = None


class PushImagesResponse(BaseModel):
    """Response model for image push"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    errors: Optional[List[dict]] = None
```

Add the route before the health check endpoint:

```python
@router.post("/push-images", response_model=PushImagesResponse)
async def push_product_images(
    request: PushImagesRequest,
    authorized: bool = Depends(verify_api_key)
):
    """
    Push processed images to Ozon product, replacing existing images.

    **Flow:**
    1. Validate input (URLs, quantities)
    2. Call Ozon API to update pictures
    3. Confirm update by fetching current images
    4. Return summary with updated counts

    **Request:**
    ```json
    {
      "credential": {
        "client_id": "xxx",
        "api_key": "xxx"
      },
      "product_id": 123456,
      "images": ["https://r2.com/img1.jpg", ...],
      "images360": ["https://r2.com/360_1.jpg", ...],
      "color_image": "https://r2.com/color.jpg"
    }
    ```

    **Response (Success):**
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

    **Response (Validation Error):**
    ```json
    {
      "success": false,
      "errors": [
        {"field": "images", "index": 2, "url": "...", "reason": "Invalid URL format"}
      ]
    }
    ```
    """
    try:
        logger.info(f"Processing Ozon image push for product_id={request.product_id}")

        # Initialize plugin
        plugin = OzonImagePushPlugin({})

        # Process the push
        result = await plugin.push_images({
            "credential": {
                "client_id": request.credential.client_id,
                "api_key": request.credential.api_key
            },
            "product_id": request.product_id,
            "images": request.images or [],
            "images360": request.images360 or [],
            "color_image": request.color_image
        })

        # Ensure success flag is set
        if "success" not in result:
            result["success"] = bool(result.get("data"))

        return result

    except Exception as e:
        logger.error(f"Ozon image push failed: {e}")
        return PushImagesResponse(
            success=False,
            data=None,
            error=str(e)
        )
```

**Step 4: Run test to verify it passes**

Run: `cd dev/ozon-backen && python -m pytest tests/api/v1/test_ozon.py -v`

Expected: All tests PASS

**Step 5: Commit**

```bash
cd H:/Web/ozon-front
git add dev/ozon-backen/app/api/v1/ozon.py dev/ozon-backen/tests/api/v1/test_ozon.py
git commit -m "feat(ozon): add /push-images API endpoint

Add endpoint for pushing images to Ozon product listings:
- POST /api/v1/ozon/push-images
- Validates product_id, array lengths
- Integrates with OzonImagePushPlugin
- Returns standardized response with updated counts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update __init__.py to Export OzonImagePushPlugin

**Files:**
- Modify: `dev/ozon-backen/app/plugins/ozon/__init__.py`

**Step 1: Update __init__.py**

Read current content of `dev/ozon-backen/app/plugins/ozon/__init__.py`, then add the export.

**Step 2: Add export**

Add to the end of `dev/ozon-backen/app/plugins/ozon/__init__.py`:

```python
from app.plugins.ozon.image_push import OzonImagePushPlugin

__all__ = ["OzonClient", "OzonDownloadPlugin", "OzonImagePushPlugin"]
```

(If the file is empty or has different exports, adjust accordingly to include OzonImagePushPlugin)

**Step 3: Commit**

```bash
cd H:/Web/ozon-front
git add dev/ozon-backen/app/plugins/ozon/__init__.py
git commit -m "feat(ozon): export OzonImagePushPlugin from __init__.py

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Create Frontend UploadModal Component

**Files:**
- Create: `src/shared/blocks/image-studio/components/modals/UploadModal.tsx`

**Step 1: Create the component file**

Create `src/shared/blocks/image-studio/components/modals/UploadModal.tsx`:

```tsx
/**
 * UploadModal Component
 * Modal for pushing processed images to Ozon product listings
 */

'use client';

import { useState } from 'react';
import { useImageStudio } from '@/app/hooks/use-image-studio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface PushResult {
  success: boolean;
  data?: {
    product_id: number;
    updated: {
      images: number;
      images360: number;
      color_image: boolean;
    };
    current_images: string[];
  };
  error?: string;
  errors?: Array<{
    field: string;
    index?: number;
    url?: string;
    reason: string;
  }>;
}

export function UploadModal() {
  const { modal, closeModal, currentSKU, processedImages } = useImageStudio();
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const isOpen = modal.type === 'upload';

  const handlePush = async () => {
    setPushing(true);
    setResult(null);

    try {
      // TODO: Get credential from secure storage
      // For now, this is a placeholder - implement based on your auth flow
      const credential = {
        client_id: localStorage.getItem('ozon_client_id') || '',
        api_key: localStorage.getItem('ozon_api_key') || ''
      };

      if (!credential.client_id || !credential.api_key) {
        setResult({
          success: false,
          error: 'Ozon API 凭证未配置，请先在设置中配置 Client ID 和 API Key'
        });
        return;
      }

      // Get product_id from currentSKU or prompt user
      const product_id = currentSKU?.productId;
      if (!product_id) {
        setResult({
          success: false,
          error: '未找到 Product ID，请先下载商品信息'
        });
        return;
      }

      // Build R2 URL list from processedImages
      const images = processedImages
        .filter(img => img.r2Url)
        .map(img => img.r2Url);

      if (images.length === 0) {
        setResult({
          success: false,
          error: '没有可推送的图片，请先处理图片'
        });
        return;
      }

      // Call backend API
      const response = await fetch('/api/v1/ozon/push-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          product_id,
          images
        })
      });

      const data: PushResult = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    closeModal();
    setResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>推送图片到 Ozon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current SKU info */}
          {currentSKU && (
            <div className="text-sm p-3 bg-neutral-50 rounded-lg">
              <p className="font-medium">当前商品</p>
              <p className="text-neutral-600">SKU: {currentSKU.name || '未设置'}</p>
              <p className="text-neutral-600">Product ID: {currentSKU.productId || '未设置'}</p>
            </div>
          )}

          {/* Image preview */}
          {processedImages.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                待推送图片 ({processedImages.length} 张)
              </p>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {processedImages.map((img) => (
                  <div key={img.id} className="aspect-square rounded overflow-hidden bg-neutral-100">
                    <img
                      src={img.r2Url || img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result display */}
          {result && (
            <div className={`p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {result.success ? (
                    <div>
                      <p className="font-medium">推送成功!</p>
                      <p className="text-sm mt-1">
                        已更新 {result.data?.updated.images} 张主图
                        {result.data?.updated.color_image && '，1 张色彩图'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">推送失败</p>
                      <p className="text-sm mt-1">{result.error}</p>
                      {result.errors && (
                        <ul className="text-sm mt-2 list-disc list-inside">
                          {result.errors.map((err, i) => (
                            <li key={i}>
                              {err.field}: {err.reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={pushing}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handlePush}
              disabled={pushing || processedImages.length === 0}
            >
              {pushing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  推送中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  确认推送
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Export from modals index**

Check if `src/shared/blocks/image-studio/components/modals/index.ts` exists, and add the export:

```tsx
export { UploadModal } from './UploadModal';
```

If the file doesn't exist, create it:

```tsx
export { DownloadModal } from './DownloadModal';
export { EditImageModal } from './EditImageModal';
export { ImageModal } from './ImageModal';
export { OptPromptModal } from './OptPromptModal';
export { ProgressModal } from './ProgressModal';
export { SettingsModal } from './SettingsModal';
export { UploadModal } from './UploadModal';
```

**Step 3: Add modal to ImageStudio component**

Find the ImageStudio main component (likely in `src/shared/blocks/image-studio/components/ImageStudio.tsx` or similar) and add the UploadModal to the modal rendering section.

Look for where other modals are rendered (like `<SettingsModal />`, `<DownloadModal />`) and add:

```tsx
<UploadModal />
```

**Step 4: Commit**

```bash
cd H:/Web/ozon-front
git add src/shared/blocks/image-studio/components/modals/UploadModal.tsx
git add src/shared/blocks/image-studio/components/modals/index.ts
git commit -m "feat(image-studio): add UploadModal for Ozon image push

Add modal component with:
- Display of processed images
- SKU and Product ID info
- Push button with loading state
- Result display (success/error)
- Integration with /api/v1/ozon/push-images

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Add Product ID to ImageStudio Context

**Files:**
- Modify: `src/shared/contexts/image-studio.tsx` (or wherever the context is defined)

**Step 1: Add productId to SKU type**

Find the SKU type definition in the image-studio context file and add `productId`:

```tsx
interface SKU {
  id: string;
  name: string;
  productId?: number;  // Add this line
  // ... other existing fields
}
```

**Step 2: Update download logic to store productId**

Find where SKU data is populated (likely in the download handler) and ensure `productId` from the Ozon API response is stored.

Look for code that processes the download response and add:

```tsx
// When processing Ozon download response, store product_id
const skuWithId = {
  ...skuData,
  productId: item.product_id  // Ensure this is captured from API
};
```

**Step 3: Commit**

```bash
cd H:/Web/ozon-front
git add src/shared/contexts/image-studio.tsx
git commit -m "feat(image-studio): add productId to SKU context

Store Ozon product_id in SKU context for use in image push.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Add Ozon Credential Configuration to Settings

**Files:**
- Modify: `src/shared/blocks/image-studio/components/modals/SettingsModal.tsx`

**Step 1: Add credential fields to settings**

Add Ozon credential input fields to the settings modal. Insert after existing settings fields:

```tsx
// Ozon API Credentials section
<div className="space-y-3 pt-3 border-t">
  <Label className="text-sm font-medium">Ozon API 凭证</Label>

  <div className="space-y-2">
    <Label htmlFor="ozon-client-id" className="text-xs text-neutral-600">
      Client ID
    </Label>
    <Input
      id="ozon-client-id"
      type="text"
      placeholder="输入 Ozon Client-Id"
      value={settings.ozonClientId || ''}
      onChange={(e) => updateSettings({ ozonClientId: e.target.value })}
      className="text-sm"
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="ozon-api-key" className="text-xs text-neutral-600">
      API Key
    </Label>
    <Input
      id="ozon-api-key"
      type="password"
      placeholder="输入 Ozon Api-Key"
      value={settings.ozonApiKey || ''}
      onChange={(e) => updateSettings({ ozonApiKey: e.target.value })}
      className="text-sm"
    />
  </div>
</div>
```

**Step 2: Add to settings interface**

Update the settings interface to include the new fields:

```tsx
interface ImageStudioSettings {
  // ... existing fields
  ozonClientId?: string;
  ozonApiKey?: string;
}
```

**Step 3: Update credential storage in UploadModal**

Update the `handlePush` function in `UploadModal.tsx` to use settings instead of localStorage:

```tsx
// Replace localStorage access with settings
const credential = {
  client_id: settings.ozonClientId || '',
  api_key: settings.ozonApiKey || ''
};
```

**Step 4: Commit**

```bash
cd H:/Web/ozon-front
git add src/shared/blocks/image-studio/components/modals/SettingsModal.tsx
git add src/shared/blocks/image-studio/components/modals/UploadModal.tsx
git commit -m "feat(image-studio): add Ozon API credential settings

Add Client ID and API Key fields to settings modal.
Credentials stored in settings, used by UploadModal.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Add Configuration to Backend Settings

**Files:**
- Modify: `dev/ozon-backen/app/core/config.py`

**Step 1: Add Ozon push configuration**

Add to the `Settings` class in `dev/ozon-backen/app/core/config.py`:

```python
# Ozon image push configuration
ozon_push_timeout: int = Field(
    default=30,
    description="Ozon API timeout in seconds for image push operations"
)
ozon_push_max_retries: int = Field(
    default=2,
    description="Maximum retry attempts for failed image push requests"
)
ozon_push_validate_urls: bool = Field(
    default=True,
    description="Whether to validate R2 URLs before sending to Ozon API"
)
```

**Step 2: Commit**

```bash
cd H:/Web/ozon-front
git add dev/ozon-backen/app/core/config.py
git commit -m "feat(config): add Ozon push configuration options

Add timeout, max_retries, and validate_urls settings for Ozon image push.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Integration Testing and Manual Verification

**Step 1: Start the backend server**

```bash
cd dev/ozon-backen
python -m uvicorn app.main:app --reload --port 8000
```

**Step 2: Start the frontend dev server**

```bash
npm run dev
```

**Step 3: Manual test checklist**

1. **Configure credentials**: Open ImageStudio settings, enter valid Ozon Client ID and API Key

2. **Download product info**: Use the download feature to fetch a product with images

3. **Process images**: Generate/edit some images in ImageStudio

4. **Test push**:
   - Click the "上传" button
   - Verify the modal shows correct SKU and Product ID
   - Verify processed images are displayed
   - Click "确认推送"
   - Verify loading state shows correctly
   - Check for success/error response

5. **Test error cases**:
   - Try pushing with invalid credentials (should show error)
   - Try pushing without processing images first (should show error)
   - Try pushing with invalid URL format (should show validation error)

**Step 4: Verify on Ozon**

After a successful push, check the product on Ozon seller portal to verify images were actually updated.

**Step 5: Commit any fixes**

If any issues are found during testing, fix them and commit:

```bash
cd H:/Web/ozon-front
git add ...
git commit -m "fix(ozon): address issues found during integration testing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Update Documentation

**Files:**
- Create: `docs/features/ozon-image-push.md` (or similar path)

**Step 1: Create user documentation**

Create documentation explaining how to use the image push feature:

```markdown
# Ozon Image Push Feature

## Overview

The ImageStudio "上传" (Upload) button allows you to push processed images directly to your Ozon product listings.

## Setup

1. **Configure API Credentials**
   - Open ImageStudio settings (gear icon)
   - Enter your Ozon Client-Id and Api-Key
   - These are passed securely to the backend

2. **Download Product Information**
   - Use the download feature to fetch your Ozon product
   - This stores the Product ID needed for pushing

3. **Process Images**
   - Use ImageStudio to generate or edit product images
   - Images are automatically stored in R2

## Pushing Images

1. Click the "上传" button in the top bar
2. Verify the product information and images in the modal
3. Click "确认推送"
4. Wait for the push to complete
5. View the result (success or error details)

## Limits

- Main images (images): Maximum 30
- 360° images (images360): Maximum 70
- Color image (color_image): 1

## Troubleshooting

**"未找到 Product ID"**: Make sure you've downloaded the product information first.

**"API 凭证未配置"**: Configure your Ozon credentials in settings.

**"推送失败"**: Check that your credentials are valid and the product exists.

## API Reference

**Endpoint**: `POST /api/v1/ozon/push-images`

See the API documentation for more details.
```

**Step 2: Commit documentation**

```bash
cd H:/Web/ozon-front
git add docs/features/ozon-image-push.md
git commit -m "docs(ozon): add image push feature documentation

Add user guide for Ozon image push feature.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

This implementation plan adds the Ozon image push feature in 10 tasks:

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Add `update_product_pictures()` to OzonClient | `client.py`, `test_client.py` |
| 2 | Create OzonImagePushPlugin | `image_push.py`, `test_image_push.py` |
| 3 | Add `/push-images` API route | `ozon.py`, `test_ozon.py` |
| 4 | Update `__init__.py` exports | `__init__.py` |
| 5 | Create UploadModal component | `UploadModal.tsx`, `index.ts` |
| 6 | Add productId to context | `image-studio.tsx` |
| 7 | Add credential settings | `SettingsModal.tsx`, `UploadModal.tsx` |
| 8 | Add backend config | `config.py` |
| 9 | Integration testing | Manual verification |
| 10 | Documentation | `ozon-image-push.md` |

**Total estimated time**: 3-4 hours

**Dependencies**:
- Python 3.9+, pytest, pytest-asyncio, pytest-mock
- Node.js, React
- Valid Ozon Seller API credentials
- R2 storage configured
