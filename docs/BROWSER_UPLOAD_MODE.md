# Browser Upload Mode for Ozon Image Downloads

## Overview

The Browser Upload Mode is an alternative download method that bypasses server-side limitations by downloading images from Ozon CDN directly in your browser and uploading them to R2.

## When to Use Browser Upload Mode

### When Server Download Fails
If the standard server download mode fails with connectivity issues to `cdn1.ozone.ru`, use browser upload mode. The browser can successfully download from Ozon CDN even when the Python backend cannot.

### Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Browser tab must remain open during download

## How It Works

### Architecture
```
┌─────────────┐         ┌──────────────┐         ┌─────────┐
│   Browser   │────────▶│   Frontend   │────────▶│ Ozon API│
│             │         │    (Next.js) │         │         │
└─────────────┘         └──────────────┘         └─────────┘
      │                         │
      │                         │
      ▼                         ▼
┌─────────────┐         ┌──────────────┐
│     R2      │◀────────│   Backend    │
│  (Cloudflare)│         │(Presigned URL)│
└─────────────┘         └──────────────┘
```

### Flow
1. **Get Image URLs**: Backend queries Ozon API for product information and image URLs (without downloading)
2. **Browser Download**: Browser downloads images directly from `cdn1.ozone.ru`
3. **Direct Upload**: Browser uploads images to R2 using presigned URLs
4. **Results**: Upload results are saved to the task

## Usage

### Step 1: Enable Browser Upload Mode
In the Ozon Image Downloader page:
1. Select your Ozon credential
2. Enter article numbers
3. **Check "Use Browser Upload Mode"**
4. Click "Get Image URLs"

### Step 2: Download and Upload
After getting image URLs:
1. Wait for the "Browser Upload Mode" section to appear
2. Click "Download [N] Images to R2" button
3. Keep the browser tab open during upload
4. Monitor progress in real-time
5. View results after completion

## Benefits

### 1. Bypasses Server Limitations
- Works when Python backend cannot access Ozon CDN
- No server-side proxy or network configuration needed

### 2. Better Performance
- Parallel downloads from browser
- Direct upload to R2 from client
- Reduced server load

### 3. Real-time Progress
- Live progress bar for each image
- Immediate success/failure feedback
- Detailed error messages

### 4. Security
- Images never touch the server
- Presigned URLs with automatic expiration
- Credentials stored securely in database

## Comparison

| Feature | Server Download | Browser Upload |
|---------|----------------|----------------|
| **Speed** | Fast (server bandwidth) | Medium (client bandwidth) |
| **Reliability** | May fail on CDN issues | High (browser handles CDN) |
| **Server Load** | High | Low |
| **Browser Required** | No | Yes (must stay open) |
| **Background Processing** | Yes | No |
| **Progress Tracking** | Polling-based | Real-time |

## Technical Details

### Image Storage Format
Images are stored in R2 with the following path structure:
```
users/{userId}/ozon/{article}/{filename}
```

Example:
```
users/user123/ozon/2194435300/8388316998.jpg
```

### API Endpoints

#### Get Upload URL
```http
POST /api/ozon/get-upload-url
Content-Type: application/json

{
  "r2_path": "users/user123/ozon/2194435300/image.jpg"
}
```

Response:
```json
{
  "code": 0,
  "data": {
    "upload_url": "https://...",
    "public_url": "https://r0.image2url.com/..."
  }
}
```

#### Create Browser Upload Task
```http
POST /api/ozon/tasks
Content-Type: application/json

{
  "credentialId": "...",
  "articles": ["2194435300"],
  "field": "offer_id",
  "useBrowserUpload": true
}
```

#### Update Task Results
```http
PATCH /api/ozon/tasks/{taskId}
Content-Type: application/json

{
  "status": "completed",
  "browserUploadResults": [
    {
      "ozonUrl": "https://cdn1.ozone.ru/...",
      "publicUrl": "https://r0.image2url.com/...",
      "success": true
    }
  ]
}
```

## Troubleshooting

### Upload Fails Midway
- **Cause**: Network interruption or browser tab closed
- **Solution**: Check task status and retry failed images

### CORS Errors
- **Cause**: R2 bucket CORS misconfiguration
- **Solution**: Ensure R2 bucket allows PUT requests from your domain

### Presigned URL Expired
- **Cause**: Upload took too long
- **Solution**: Click download button again to get fresh URLs

### Images Not Appearing
- **Cause**: Upload failed or incorrect R2 path
- **Solution**: Check browser console for error messages

## Best Practices

1. **Batch Size**: Keep batches under 100 articles for optimal performance
2. **Network**: Use stable internet connection during upload
3. **Browser**: Keep tab open and visible (don't minimize)
4. **Monitoring**: Watch progress bar for real-time feedback
5. **Results**: Review results after completion for any failures

## Future Enhancements

- [ ] Automatic retry for failed uploads
- [ ] Background processing with Service Workers
- [ ] Resume interrupted uploads
- [ ] Download history and statistics
- [ ] Bulk export of R2 URLs
