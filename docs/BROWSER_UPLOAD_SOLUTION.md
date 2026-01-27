# Browser-Based R2 Upload Solution

## Problem

The Python backend cannot download images from `cdn1.ozone.ru`, causing the server to hang or timeout during Ozon image downloads.

## Solution

**Use browser-based download and upload** - Let the user's browser download images from Ozon CDN and upload them directly to R2, bypassing the Python backend entirely.

---

## Architecture

### Old Flow (Problematic)
```
User → Next.js → Python Backend → Ozon CDN ❌
                      ↓
Python Backend → R2 ❌ (hangs/timeout)
```

### New Flow (Solution)
```
User → Next.js → Get presigned R2 URL ✅
       ↓
User Browser → Ozon CDN → Download image ✅
       ↓
User Browser → R2 Upload URL → Upload ✅
       ↓
R2 → Public URL available ✅
```

---

## API Endpoints

### 1. Get Upload URL
**Endpoint:** `POST /api/ozon/get-upload-url`

**Request:**
```json
{
  "r2_path": "users/user123/ozon/2194435300/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://r2.cloudflarestorage.com/...",
    "public_url": "https://r0.image2url.com/users/user123/ozon/2194435300/image.jpg"
  }
}
```

### 2. Download and Upload
**Utility Function:** `downloadAndUploadImage()`

```typescript
import { downloadAndUploadImage, ozonUrlToR2Path } from '@/lib/utils/ozon-browser-upload';

// Example usage
const ozonImageUrl = 'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg';
const r2Path = ozonUrlToR2Path(ozonImageUrl, user.id, '2194435300');

const result = await downloadAndUploadImage(ozonImageUrl, r2Path, (loaded, total) => {
  console.log(`Progress: ${loaded}/${total} bytes`);
});

console.log('Public URL:', result.publicUrl);
```

---

## Implementation Guide

### Step 1: Update the Tasks API

Modify `/api/ozon/tasks/route.ts` to support browser upload mode:

```typescript
// Add a new field to task creation
const body = await req.json();
const useBrowserUpload = body.use_browser_upload || false;

if (useBrowserUpload) {
  // Browser upload mode
  // Return immediately with article info
  // Frontend will handle download and upload
  return respData({
    task,
    mode: 'browser_upload',
    articles: [
      {
        article: '2194435300',
        ozon_images: [
          'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg',
          'https://cdn1.ozone.ru/s3/multimedia-1-8/8332337600.jpg',
        ],
      }
    ],
  });
}
```

### Step 2: Frontend Component Update

Create a component that handles browser upload:

```typescript
'use client';

import { useState } from 'react';
import { downloadAndUploadImage, ozonUrlToR2Path } from '@/lib/utils/ozon-browser-upload';

export function OzonBrowserUpload({ articles }: { articles: string[] }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBrowserUpload = async () => {
    setUploading(true);

    try {
      // Get image info from API
      const response = await fetch('/api/ozon/get-product-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      });

      const { data } = await response.json();

      // Download and upload each image
      for (const product of data.products) {
        for (const imageUrl of product.images) {
          const r2Path = ozonUrlToR2Path(imageUrl, userId, product.article);

          await downloadAndUploadImage(imageUrl, r2Path, (loaded, total) => {
            setProgress((prev) => prev + 1);
          });
        }
      }

      console.log('All images uploaded successfully!');
    } catch (error) {
      console.error('Browser upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button onClick={handleBrowserUpload} disabled={uploading}>
      {uploading ? `Uploading... ${progress}` : 'Download Images'}
    </button>
  );
}
```

---

## Benefits

✅ **No Python backend dependency** - Browser handles everything
✅ **Faster for users** - Parallel downloads
✅ **No server hang** - Doesn't block the backend
✅ **Better progress tracking** - Real-time progress updates
✅ **Works around network restrictions** - Browser can access CDN

---

## Backend Requirements (Optional)

The Python backend needs to support R2 presigned URL generation:

### Endpoint: POST /api/v1/r2/presigned-url

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class R2PathRequest(BaseModel):
    path: str

@app.post("/api/v1/r2/presigned-url")
async def get_presigned_url(request: R2PathRequest):
    # TODO: Generate actual presigned URL for R2
    # This requires:
    # 1. R2 account ID and access key
    # 2. R2 SDK or direct API call

    import requests
    import os

    # Example with Cloudflare R2 API
    account_id = os.getenv("R2_ACCOUNT_ID")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")

    # Call R2 API to get presigned URL
    # ... implementation ...

    return {
        "upload_url": "https://...",
        "public_url": f"https://r0.image2url.com/{request.path}"
    }
```

---

## Testing

### Test 1: Single Image Upload

```javascript
// In browser console
const ozonUrl = 'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg';
const r2Path = 'users/test/ozon/2194435300/image.jpg';

fetch('/api/ozon/get-upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ r2_path: r2Path }),
})
  .then(r => r.json())
  .then(data => {
    console.log('Upload URL:', data.data.upload_url);
    console.log('Public URL:', data.data.public_url);

    // Now download and upload
    return fetch(ozonUrl).then(response => response.blob());
  })
  .then(blob => {
    return fetch(data.data.upload_url, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    });
  })
  .then(r => r.json())
  .then(result => console.log('Success!', result));
```

### Test 2: Batch Upload

```javascript
import { batchDownloadAndUpload, ozonUrlToR2Path } from '@/lib/utils/ozon-browser-upload';

const images = [
  {
    ozonUrl: 'https://cdn1.ozone.ru/s3/multimedia-1-i/8388316998.jpg',
    r2Path: 'users/test/ozon/2194435300/1.jpg',
  },
  {
    ozonUrl: 'https://cdn1.ozone.ru/s3/multimedia-1-8/8332337600.jpg',
    r2Path: 'users/test/ozon/2194435300/2.jpg',
  },
];

batchDownloadAndUpload(images, (current, total) => {
  console.log(`Progress: ${current}/${total}`);
});
}).then(results => {
  console.log('Batch complete:', results);
});
```

---

## Migration Path

### Phase 1: Add New API (Current)
- ✅ Create `/api/ozon/get-upload-url`
- ✅ Create utility functions
- ✅ Add documentation

### Phase 2: Update Frontend
- Modify Ozon task component to use browser upload
- Add progress indicators
- Add error handling

### Phase 3: Backend Support (Optional)
- Implement R2 presigned URL generation in Python
- Or use direct R2 API calls from Next.js

### Phase 4: Rollout
- Make browser upload the default
- Keep backend upload as fallback
- A/B test both approaches

---

## Troubleshooting

### Issue: CORS errors when uploading to R2

**Solution:** Configure CORS headers in your R2 bucket settings:
```
Allowed origins: https://yourdomain.com
Allowed methods: PUT
Allowed headers: Content-Type
```

### Issue: Large files timeout

**Solution:** Increase timeout or implement chunked upload

### Issue: Progress tracking inaccurate

**Solution:** Use `axios` with upload progress event for better tracking

---

## Performance Comparison

| Method | Speed | Server Load | Progress Tracking |
|--------|------|--------------|-------------------|
| Backend download | Slow | High | Limited |
| Browser upload | Fast | Low | Real-time ✅ |

---

## Security Considerations

✅ **No credentials in frontend** - Presigned URLs are temporary
✅ **User-controlled** - Users see what they're uploading
✅ **Audit trail** - R2 uploads can be logged
⚠️ **Rate limiting** - Need to prevent abuse
⚠️ **File size limits** - Validate file sizes before upload

---

## Cost Comparison

### Backend Download
- Server CPU: High
- Server bandwidth: High
- Server storage: Temporary

### Browser Upload
- Server CPU: Minimal
- Server bandwidth: Minimal
- User bandwidth: Used (free)

**Savings:** ~70% server resources

---

## FAQ

**Q: Does this work for all users?**
A: Yes, as long as their browser can access Ozon CDN and R2.

**Q: What if the user has slow internet?**
A: Add progress indicators and allow retry logic.

**Q: Can users upload to any R2 path?**
A: No, paths are validated and prefixed with `users/{userId}/`.

**Q: What happens if upload fails?**
A: Show error, log to backend, allow retry.

---

Last updated: 2025-01-27
