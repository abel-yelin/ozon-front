# Ozon Image Push Feature

## Overview

The ImageStudio "上传" (Upload) button allows you to push processed images directly to your Ozon product listings via the Ozon Seller API.

## Architecture

- **Backend**: Python FastAPI at `/api/v1/ozon/push-images`
- **Frontend**: React UploadModal component
- **Integration**: Ozon Seller API `/v1/product/pictures` endpoint

## Setup

### 1. Configure API Credentials

1. Open ImageStudio settings (gear icon or Settings button)
2. Scroll to "Ozon API 凭证" section
3. Enter your credentials:
   - **Client ID**: Your Ozon Client-Id (from seller.ozon.ru)
   - **API Key**: Your Ozon Api-Key
4. Credentials are stored in your user settings

### 2. Download Product Information

Use the download feature to fetch your Ozon product. This stores the Product ID needed for pushing images.

### 3. Process Images

Use ImageStudio to generate or edit product images. Images are automatically stored in R2 and available for pushing.

## Usage

### Pushing Images to Ozon

1. Select a product in ImageStudio
2. Process/generate your images
3. Click the "上传" button in the top bar
4. Verify the product information and images in the modal
5. Click "确认推送" to start the push
6. Wait for the operation to complete
7. View the result (success or error details)

### Response Details

**Success Response:**
- Shows number of images updated
- Shows if color image was updated
- Confirms the update with current image list

**Error Response:**
- Shows specific error message
- Lists validation errors for any invalid URLs
- Common errors:
  - Missing credentials
  - Invalid Product ID
  - URL validation failures
  - Ozon API errors

## Limits and Constraints

| Field | Maximum |
|-------|---------|
| Main images (images) | 30 |
| 360° images (images360) | 70 |
| Color image (color_image) | 1 |

The API automatically truncates arrays that exceed these limits.

## Troubleshooting

### "未找到 Product ID"
**Cause**: Product information not downloaded
**Solution**: Use the download feature first to fetch product data from Ozon

### "Ozon API 凭证未配置"
**Cause**: Credentials not set in settings
**Solution**: Configure your Ozon Client-Id and Api-Key in settings

### "没有可推送的图片"
**Cause**: No processed images with R2 URLs
**Solution**: Process images first to generate R2 URLs

### "Invalid URL format"
**Cause**: Image URL doesn't start with http/https
**Solution**: Ensure all images are stored in R2 with proper URLs

### "推送失败"
**Cause**: Various (invalid credentials, product not found, API error)
**Solution**:
- Verify credentials are correct
- Check product exists on Ozon
- Check backend logs for specific error

## API Reference

### POST /api/v1/ozon/push-images

Pushes processed images to an Ozon product.

**Request:**
```json
{
  "credential": {
    "client_id": "your-client-id",
    "api_key": "your-api-key"
  },
  "product_id": 123456,
  "images": ["https://r2.com/img1.jpg", "https://r2.com/img2.jpg"],
  "images360": ["https://r2.com/360_1.jpg"],
  "color_image": "https://r2.com/color.jpg"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "product_id": 123456,
    "updated": {
      "images": 2,
      "images360": 1,
      "color_image": true
    },
    "current_images": ["url1", "url2"]
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "errors": [
    {"field": "images", "index": 2, "url": "...", "reason": "Invalid URL format"}
  ]
}
```

## Backend Configuration

The backend supports these environment variables in `app/core/config.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ozon_push_timeout` | 30 | Ozon API timeout in seconds |
| `ozon_push_max_retries` | 2 | Maximum retry attempts |
| `ozon_push_validate_urls` | true | Validate URLs before sending |

## Implementation Details

### Components

- **`OzonClient.update_product_pictures()`**: Core API client method
- **`OzonImagePushPlugin`**: Validation and orchestration
- **`UploadModal`**: Frontend UI component
- **SettingsModal**: Credential configuration

### Files

| File | Description |
|------|-------------|
| `dev/ozon-backen/app/plugins/ozon/client.py` | Ozon API client |
| `dev/ozon-backen/app/plugins/ozon/image_push.py` | Push plugin |
| `dev/ozon-backen/app/api/v1/ozon.py` | API route |
| `src/shared/blocks/image-studio/components/modals/UploadModal.tsx` | UI modal |
| `src/shared/blocks/image-studio/components/modals/SettingsModal.tsx` | Settings UI |

## Security Notes

- Credentials are stored in user settings (backend)
- API calls require valid X-API-Key header
- Credentials are passed to backend, never exposed in frontend
- URLs are validated before sending to Ozon API
