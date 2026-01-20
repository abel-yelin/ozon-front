# AI Playground Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI Playground image processing capabilities to the FastAPI backend, following the existing plugin architecture and maintaining stateless design (no database writes).

**Architecture:** The AI Playground will be implemented as a plugin-based service with three distinct AI processing plugins:
- `AiPlaygroundPlugin` - Main plugin orchestrating all AI job types
- Each job type (background_replacement, batch_optimization, image_enhancement) will be handled by the same plugin
- Jobs are processed asynchronously with progress tracking via in-memory state
- Results are returned to frontend for database storage

**Tech Stack:** FastAPI, Pydantic, PIL/Pillow, requests, aiohttp, boto3 (R2), threading, asyncio

---

## Architecture Overview

### Backend (FastAPI at `H:/Web/ozon-front/dev/ozon-backen/`)
- **Plugin-based**: Follows existing `BasePlugin` pattern
- **Stateless**: No database writes, all state managed by frontend
- **Async Processing**: Background jobs with cancellation support
- **Storage**: Uses existing `R2Service` for image uploads

### Frontend (Next.js at `H:/Web/ozon-front/`)
- Already implemented with complete database, API routes, UI
- Communicates with Python backend via `aiPlaygroundApi`
- Handles all database operations (jobs, logs, settings, etc.)

### Reference Implementation (demo2)
- `batch_background_replacer.py` - AI image processing logic
- `job_queue.py` - Job queue with cancellation
- `web_server.py` - API endpoints pattern

---

## Task Structure

### Task 1: Create AI Playground Module Structure

**Files:**
- Create: `app/plugins/ai/__init__.py`
- Create: `app/plugins/ai/playground.py` - Main AI Playground plugin
- Create: `app/services/ai_processor.py` - Core AI processing logic
- Create: `app/api/v1/ai.py` - AI Playground API routes

**Step 1: Create the plugin directory structure**

Create the `ai` plugin directory with `__init__.py`:

```bash
mkdir -p H:/Web/ozon-front/dev/ozon-backen/app/plugins/ai
```

**Step 2: Create `app/plugins/ai/__init__.py`**

```python
"""AI Playground plugin - AI image processing capabilities"""

from app.plugins.ai.playground import AiPlaygroundPlugin

__all__ = ["AiPlaygroundPlugin"]
```

**Step 3: Create `app/services/ai_processor.py` - Core AI processing service**

```python
"""AI Image Processing Service - Core processing logic for AI operations

This module contains the heavy lifting logic for:
- Background replacement using external LLM API
- Batch optimization (compression, resizing)
- Image enhancement (sharpening, upscaling)
"""

from __future__ import annotations
import base64
import io
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageFilter, ImageEnhance
import aiohttp
import requests
import logging

logger = logging.getLogger(__name__)


class AiImageProcessor:
    """Core AI image processing service"""

    def __init__(self, config: Dict[str, Any]):
        """Initialize AI processor with configuration

        Args:
            config: Dictionary containing:
                - api_base: LLM API base URL
                - api_key: LLM API key
                - model: Model name for image generation
                - target_width: Default target width
                - target_height: Default target height
                - default_temperature: Default temperature for generation
        """
        self.api_base = config.get("api_base", "")
        self.api_key = config.get("api_key", "")
        self.model = config.get("model", "")
        self.target_width = config.get("target_width", 1500)
        self.target_height = config.get("target_height", 2000)
        self.default_temperature = config.get("default_temperature", 0.5)

    async def process_background_replacement(
        self,
        image_data: bytes,
        background_prompt: str,
        negative_prompt: str = "",
        temperature: float = 0.5,
        cancel_check: Optional[callable] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Process background replacement using AI

        Args:
            image_data: Source image bytes
            background_prompt: Description of desired background
            negative_prompt: Things to avoid in the background
            temperature: Generation temperature (0-1)
            cancel_check: Optional callable to check for cancellation

        Returns:
            Tuple of (result_image_bytes, metadata)

        Raises:
            ValueError: If API configuration is invalid
            requests.RequestException: If API call fails
            Exception: If processing fails
        """
        if cancel_check:
            cancel_check()

        if not self.api_key or not self.api_base or not self.model:
            raise ValueError("AI API configuration is incomplete")

        # Load image
        image = Image.open(io.BytesIO(image_data))
        if image.mode != "RGB":
            image = image.convert("RGB")

        original_width, original_height = image.size

        # Build prompt
        extra_prompt = f"Background: {background_prompt}"
        if negative_prompt:
            extra_prompt += f". Negative: {negative_prompt}"

        # Call external LLM API for image generation
        result_image = await self._call_ai_image_api(
            image=image,
            prompt=extra_prompt,
            temperature=temperature,
            cancel_check=cancel_check
        )

        metadata = {
            "original_width": original_width,
            "original_height": original_height,
            "result_width": result_image.width,
            "result_height": result_image.height,
            "background_prompt": background_prompt,
        }

        # Convert result to bytes
        output = io.BytesIO()
        result_image.save(output, format="PNG")
        result_bytes = output.getvalue()

        return result_bytes, metadata

    async def process_batch_optimization(
        self,
        image_data: bytes,
        quality: str = "standard",
        output_format: str = "webp",
        max_size: int = 1920,
        maintain_aspect: bool = True,
        cancel_check: Optional[callable] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Process batch optimization (compression and resizing)

        Args:
            image_data: Source image bytes
            quality: Quality level (low, standard, high)
            output_format: Output format (png, jpg, webp)
            max_size: Maximum dimension
            maintain_aspect: Whether to maintain aspect ratio
            cancel_check: Optional callable to check for cancellation

        Returns:
            Tuple of (optimized_image_bytes, metadata)
        """
        if cancel_check:
            cancel_check()

        image = Image.open(io.BytesIO(image_data))
        original_size = len(image_data)
        original_width, original_height = image.size

        # Determine quality values
        quality_map = {"low": 70, "standard": 85, "high": 95}
        jpeg_quality = quality_map.get(quality, 85)

        # Resize if needed
        if max_size and (image.width > max_size or image.height > max_size):
            if maintain_aspect:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            else:
                image = image.resize((max_size, max_size), Image.Resampling.LANCZOS)

        # Determine format
        format_map = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "webp": "WEBP"}
        pil_format = format_map.get(output_format.lower(), "PNG")

        # Save with optimization
        output = io.BytesIO()
        save_kwargs = {}
        if pil_format in ("JPEG", "WEBP"):
            save_kwargs["quality"] = jpeg_quality
            save_kwargs["optimize"] = True

        image.save(output, format=pil_format, **save_kwargs)
        result_bytes = output.getvalue()

        metadata = {
            "original_width": original_width,
            "original_height": original_height,
            "result_width": image.width,
            "result_height": image.height,
            "original_size": original_size,
            "result_size": len(result_bytes),
            "compression_ratio": round(1 - len(result_bytes) / original_size, 2),
            "quality": quality,
            "format": output_format,
        }

        return result_bytes, metadata

    async def process_image_enhancement(
        self,
        image_data: bytes,
        enhancement_level: int = 5,
        sharpen: bool = True,
        denoise: bool = True,
        upscale: bool = False,
        cancel_check: Optional[callable] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Process image enhancement

        Args:
            image_data: Source image bytes
            enhancement_level: Enhancement level (1-10)
            sharpen: Whether to apply sharpening
            denoise: Whether to apply denoising
            upscale: Whether to upscale 2x
            cancel_check: Optional callable to check for cancellation

        Returns:
            Tuple of (enhanced_image_bytes, metadata)
        """
        if cancel_check:
            cancel_check()

        image = Image.open(io.BytesIO(image_data))
        if image.mode != "RGB":
            image = image.convert("RGB")

        original_width, original_height = image.size

        # Apply sharpening
        if sharpen:
            image = image.filter(ImageFilter.SHARPEN)
            if cancel_check:
                cancel_check()

        # Apply denoising (smooth)
        if denoise:
            image = image.filter(ImageFilter.SMOOTH)
            if cancel_check:
                cancel_check()

        # Adjust contrast based on enhancement level
        if enhancement_level > 0:
            enhancer = ImageEnhance.Contrast(image)
            contrast_factor = 1.0 + (enhancement_level * 0.05)
            image = enhancer.enhance(contrast_factor)
            if cancel_check:
                cancel_check()

            # Adjust brightness slightly
            enhancer = ImageEnhance.Brightness(image)
            brightness_factor = 1.0 + (enhancement_level * 0.03)
            image = enhancer.enhance(brightness_factor)
            if cancel_check:
                cancel_check()

        # Upscale if requested
        if upscale:
            new_width = image.width * 2
            new_height = image.height * 2
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        image.save(output, format="PNG")
        result_bytes = output.getvalue()

        metadata = {
            "original_width": original_width,
            "original_height": original_height,
            "result_width": image.width,
            "result_height": image.height,
            "enhancement_level": enhancement_level,
            "sharpen": sharpen,
            "denoise": denoise,
            "upscale": upscale,
        }

        return result_bytes, metadata

    async def _call_ai_image_api(
        self,
        image: Image.Image,
        prompt: str,
        temperature: float,
        cancel_check: Optional[callable] = None
    ) -> Image.Image:
        """Call external LLM API for image generation/editing

        Args:
            image: PIL Image to process
            prompt: Processing prompt
            temperature: Generation temperature
            cancel_check: Optional callable to check for cancellation

        Returns:
            Processed PIL Image

        Raises:
            requests.RequestException: If API call fails
        """
        # Encode image to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        image_bytes = buffered.getvalue()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Build API request
        url = f"{self.api_base.rstrip('/')}/{self.model}:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": "image/png", "data": base64_image}},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {"temperature": temperature}
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        if cancel_check:
            cancel_check()

        # Make API call
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=300) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise requests.RequestException(f"API error {response.status}: {error_text}")

                data = await response.json()

        if cancel_check:
            cancel_check()

        # Parse response
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates in API response")

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])

        # Look for inline data (image)
        for part in parts:
            inline_data = part.get("inlineData")
            if inline_data:
                result_base64 = inline_data.get("data", "")
                result_bytes = base64.b64decode(result_base64)
                return Image.open(io.BytesIO(result_bytes))

        raise ValueError("No image data in API response")

    @staticmethod
    def download_image(url: str) -> bytes:
        """Download image from URL

        Args:
            url: Image URL (http, https, or data: base64)

        Returns:
            Image bytes

        Raises:
            ValueError: If URL is invalid or download fails
        """
        if url.startswith("data:image"):
            # Base64 encoded image
            header, data = url.split(",", 1)
            return base64.b64decode(data)

        elif url.startswith("http://") or url.startswith("https://"):
            # URL image - download synchronously
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content

        else:
            # Local file path
            path = Path(url)
            if not path.exists():
                raise FileNotFoundError(f"Image not found: {url}")
            return path.read_bytes()
```

**Step 4: Verify the files were created**

```bash
ls -la H:/Web/ozon-front/dev/ozon-backen/app/plugins/ai/
ls -la H:/Web/ozon-front/dev/ozon-backen/app/services/ai_processor.py
```

Expected: Files exist with correct content.

**Step 5: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add app/plugins/ai/__init__.py app/services/ai_processor.py
git commit -m "feat: add AI playground plugin structure and core processor"
```

---

### Task 2: Create AiPlaygroundPlugin - Main Plugin Implementation

**Files:**
- Modify: `app/plugins/ai/playground.py`

**Step 1: Create the plugin class**

```python
"""AI Playground Plugin - Main plugin for AI image processing operations

This plugin handles three types of AI jobs:
1. Background replacement - Replace image backgrounds with AI-generated scenes
2. Batch optimization - Compress and optimize multiple images
3. Image enhancement - Enhance image quality with upscaling and filters
"""

from __future__ import annotations
import asyncio
import io
import logging
import uuid
import threading
from typing import Any, Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

from app.plugins.base import BasePlugin, ProcessingMode
from app.services.ai_processor import AiImageProcessor
from app.services.storage import R2Service

logger = logging.getLogger(__name__)


class AiPlaygroundPlugin(BasePlugin):
    """
    AI Playground Plugin for image processing operations.

    This plugin maintains an in-memory job state for tracking processing jobs.
    It does NOT write to any database - all persistence is handled by the frontend.
    """

    name = "ai-playground"
    display_name = "AI Playground"
    category = "ai"
    processing_mode = ProcessingMode.SYNC

    def __init__(self, config: Dict[str, Any]):
        """Initialize the AI Playground plugin

        Args:
            config: Plugin configuration dictionary containing:
                - api_base: LLM API base URL
                - api_key: LLM API key
                - model: Model name for image generation
                - target_width: Default target width
                - target_height: Default target height
                - default_temperature: Default temperature
        """
        self.config = config
        self.processor = AiImageProcessor(config)
        self.r2 = R2Service()

        # In-memory job state (NOT persistent)
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._job_lock = threading.Lock()
        self._cancel_events: Dict[str, threading.Event] = {}

    @property
    def enabled(self) -> bool:
        """Plugin is enabled if API key is configured"""
        return bool(self.config.get("api_key"))

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process an AI job request

        Args:
            input_data: Dictionary containing:
                - job_id: Unique job identifier
                - user_id: User identifier
                - type: Job type (background_replacement, batch_optimization, image_enhancement)
                - config: Job-specific configuration
                - source_image_urls: List of source image URLs

        Returns:
            Dictionary with:
                - success: bool
                - data: Result data (if successful)
                - error: Error message (if failed)
        """
        job_id = input_data.get("job_id") or str(uuid.uuid4())
        job_type = input_data.get("type", "background_replacement")
        source_urls = input_data.get("source_image_urls", [])
        config = input_data.get("config", {})

        if not source_urls:
            return {"success": False, "error": "No source images provided"}

        # Initialize job state
        with self._job_lock:
            self._jobs[job_id] = {
                "job_id": job_id,
                "type": job_type,
                "status": "processing",
                "progress": 0,
                "total": len(source_urls),
                "processed": 0,
                "result_urls": [],
                "source_urls": source_urls,
                "metadata": [],
                "error": None,
            }
            self._cancel_events[job_id] = threading.Event()

        try:
            # Process each image
            for idx, url in enumerate(source_urls):
                # Check for cancellation
                if self._cancel_events[job_id].is_set():
                    raise Exception("Job cancelled")

                # Download source image
                try:
                    image_bytes = self.processor.download_image(url)
                except Exception as e:
                    logger.error(f"Failed to download image {idx + 1}: {e}")
                    with self._job_lock:
                        job = self._jobs.get(job_id, {})
                        job["error"] = f"Image {idx + 1} download failed: {str(e)}"
                        job["status"] = "failed"
                    return {"success": False, "error": job["error"]}

                # Process based on job type
                try:
                    result_bytes, metadata = await self._process_single_image(
                        job_type=job_type,
                        image_bytes=image_bytes,
                        config=config,
                        cancel_check=lambda: self._check_cancelled(job_id)
                    )
                except Exception as e:
                    logger.error(f"Failed to process image {idx + 1}: {e}")
                    with self._job_lock:
                        job = self._jobs.get(job_id, {})
                        job["error"] = f"Image {idx + 1} processing failed: {str(e)}"
                        job["status"] = "failed"
                    return {"success": False, "error": job["error"]}

                # Upload result to R2
                try:
                    result_filename = f"ai_playground_{job_id}_{idx + 1}.png"
                    result_url = await self.r2.upload(
                        data=result_bytes,
                        filename=result_filename,
                        content_type="image/png"
                    )
                except Exception as e:
                    logger.error(f"Failed to upload result {idx + 1}: {e}")
                    with self._job_lock:
                        job = self._jobs.get(job_id, {})
                        job["error"] = f"Image {idx + 1} upload failed: {str(e)}"
                        job["status"] = "failed"
                    return {"success": False, "error": job["error"]}

                # Update job state
                with self._job_lock:
                    job = self._jobs.get(job_id, {})
                    job["result_urls"].append(result_url)
                    job["metadata"].append(metadata)
                    job["processed"] += 1
                    job["progress"] = int((idx + 1) / len(source_urls) * 100)

            # Mark job as completed
            with self._job_lock:
                job = self._jobs.get(job_id, {})
                job["status"] = "completed"
                job["progress"] = 100

            return {
                "success": True,
                "data": {
                    "job_id": job_id,
                    "status": "completed",
                    "result_image_urls": job["result_urls"],
                    "source_image_urls": job["source_urls"],
                    "metadata": job["metadata"],
                }
            }

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            with self._job_lock:
                job = self._jobs.get(job_id, {})
                job["status"] = "failed"
                job["error"] = str(e)
            return {"success": False, "error": str(e)}

    async def _process_single_image(
        self,
        job_type: str,
        image_bytes: bytes,
        config: Dict[str, Any],
        cancel_check: Optional[callable] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Process a single image based on job type

        Args:
            job_type: Type of processing to apply
            image_bytes: Source image bytes
            config: Processing configuration
            cancel_check: Optional callable to check for cancellation

        Returns:
            Tuple of (result_bytes, metadata)
        """
        if job_type == "background_replacement":
            background_prompt = config.get("backgroundPrompt", "")
            negative_prompt = config.get("negativePrompt", "")
            quality = config.get("quality", "standard")
            temperature = 0.5 if quality == "standard" else 0.3 if quality == "high" else 0.7

            return await self.processor.process_background_replacement(
                image_data=image_bytes,
                background_prompt=background_prompt,
                negative_prompt=negative_prompt,
                temperature=temperature,
                cancel_check=cancel_check
            )

        elif job_type == "batch_optimization":
            quality = config.get("quality", "standard")
            output_format = config.get("format", "webp")
            max_size = config.get("maxSize", 1920)
            maintain_aspect = config.get("maintainAspect", True)

            return await self.processor.process_batch_optimization(
                image_data=image_bytes,
                quality=quality,
                output_format=output_format,
                max_size=max_size,
                maintain_aspect=maintain_aspect,
                cancel_check=cancel_check
            )

        elif job_type == "image_enhancement":
            enhancement_level = config.get("enhancementLevel", 5)
            sharpen = config.get("sharpen", True)
            denoise = config.get("denoise", True)
            upscale = config.get("upscale", False)

            return await self.processor.process_image_enhancement(
                image_data=image_bytes,
                enhancement_level=enhancement_level,
                sharpen=sharpen,
                denoise=denoise,
                upscale=upscale,
                cancel_check=cancel_check
            )

        else:
            raise ValueError(f"Unknown job type: {job_type}")

    def _check_cancelled(self, job_id: str) -> bool:
        """Check if a job has been cancelled

        Args:
            job_id: Job identifier

        Returns:
            True if cancelled, False otherwise
        """
        event = self._cancel_events.get(job_id)
        return event is not None and event.is_set()

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a job

        Args:
            job_id: Job identifier

        Returns:
            Job status dict or None if not found
        """
        with self._job_lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            return {
                "job_id": job["job_id"],
                "status": job["status"],
                "progress": job["progress"],
                "processed": job["processed"],
                "total": job["total"],
                "message": job.get("error"),
            }

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job

        Args:
            job_id: Job identifier

        Returns:
            True if job was cancelled, False otherwise
        """
        with self._job_lock:
            job = self._jobs.get(job_id)
            if not job:
                return False

            if job["status"] in ("processing", "pending"):
                job["status"] = "cancelled"
                event = self._cancel_events.get(job_id)
                if event:
                    event.set()
                return True

            return False

    def validate_input(self, input_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate input data

        Args:
            input_data: Input data dictionary

        Returns:
            Tuple of (is_valid, error_message)
        """
        required_fields = ["job_id", "type", "source_image_urls", "config"]

        for field in required_fields:
            if field not in input_data:
                return False, f"Missing required field: {field}"

        job_type = input_data.get("type")

        if job_type not in ("background_replacement", "batch_optimization", "image_enhancement"):
            return False, f"Invalid job type: {job_type}"

        source_urls = input_data.get("source_image_urls", [])

        if not isinstance(source_urls, list) or not source_urls:
            return False, "source_image_urls must be a non-empty list"

        config = input_data.get("config", {})

        if job_type == "background_replacement":
            if not config.get("backgroundPrompt"):
                return False, "backgroundPrompt is required for background replacement"

        return True, None

    async def health_check(self) -> bool:
        """Health check - verifies API key is configured

        Returns:
            True if plugin is healthy, False otherwise
        """
        return bool(self.config.get("api_key"))
```

**Step 2: Update the `__init__.py` to export the plugin**

Modify `app/plugins/ai/__init__.py`:

```python
"""AI Playground plugin - AI image processing capabilities"""

from app.plugins.ai.playground import AiPlaygroundPlugin

__all__ = ["AiPlaygroundPlugin"]
```

**Step 3: Verify the plugin file**

```bash
cat H:/Web/ozon-front/dev/ozon-backen/app/plugins/ai/playground.py
```

Expected: Plugin class with all methods defined.

**Step 4: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add app/plugins/ai/playground.py
git commit -m "feat: add AiPlaygroundPlugin with job management"
```

---

### Task 3: Create AI Playground API Routes

**Files:**
- Create: `app/api/v1/ai.py` - AI Playground API endpoints

**Step 1: Create the API router**

```python
"""AI Playground API endpoints

This module provides REST API endpoints for AI Playground operations:
- Submit AI jobs
- Get job status
- Get job results
- Cancel jobs
- Health check
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from app.plugins.plugin_manager import plugin_manager
from app.api.deps import verify_api_key
import time

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class BackgroundReplacementConfig(BaseModel):
    backgroundPrompt: str
    negativePrompt: Optional[str] = ""
    quality: Optional[str] = "standard"
    format: Optional[str] = "png"
    seed: Optional[int] = None


class BatchOptimizationConfig(BaseModel):
    quality: Optional[str] = "standard"
    format: Optional[str] = "webp"
    maxSize: Optional[int] = 1920
    maintainAspect: Optional[bool] = True


class ImageEnhancementConfig(BaseModel):
    enhancementLevel: Optional[int] = 5
    sharpen: Optional[bool] = True
    denoise: Optional[bool] = True
    upscale: Optional[bool] = False


class AiJobRequest(BaseModel):
    job_id: str
    user_id: str
    type: str  # background_replacement, batch_optimization, image_enhancement
    config: Dict[str, Any]
    source_image_urls: List[str]


class AiJobResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_ms: Optional[int] = None


class AiJobProgress(BaseModel):
    job_id: str
    status: str
    progress: int
    processed: int
    total: int
    current_image: Optional[str] = None
    message: Optional[str] = None


class AiJobResult(BaseModel):
    job_id: str
    status: str
    result_image_urls: List[str]
    source_image_urls: List[str]
    processing_time_ms: int
    metadata: List[Dict[str, Any]]


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/job", response_model=AiJobResponse)
async def submit_ai_job(
    request: AiJobRequest,
    authorized: bool = Depends(verify_api_key)
):
    """Submit a new AI processing job

    This endpoint accepts AI job requests and returns immediately.
    Processing happens asynchronously in the background.

    Args:
        request: Job request containing type, config, and source images
        authorized: API key authorization

    Returns:
        Job response with job_id and initial status
    """
    plugin = plugin_manager.get("ai-playground")

    if not plugin:
        raise HTTPException(status_code=501, detail="AI Playground plugin not found")

    if not plugin.enabled:
        raise HTTPException(status_code=503, detail="AI Playground plugin is not enabled")

    # Validate input
    is_valid, error = plugin.validate_input(request.model_dump())
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Process job (this will run asynchronously)
    start = time.time()

    result = await plugin.process(request.model_dump())

    execution_time = int((time.time() - start) * 1000)

    if result.get("success"):
        return AiJobResponse(
            success=True,
            data=result.get("data"),
            execution_time_ms=execution_time
        )
    else:
        return AiJobResponse(
            success=False,
            error=result.get("error", "Unknown error"),
            execution_time_ms=execution_time
        )


@router.get("/job/{job_id}/status", response_model=AiJobProgress)
async def get_ai_job_status(
    job_id: str,
    authorized: bool = Depends(verify_api_key)
):
    """Get the current status of an AI job

    Args:
        job_id: Job identifier
        authorized: API key authorization

    Returns:
        Current job progress information
    """
    plugin = plugin_manager.get("ai-playground")

    if not plugin:
        raise HTTPException(status_code=501, detail="AI Playground plugin not found")

    status = plugin.get_job_status(job_id)

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return AiJobProgress(**status)


@router.post("/job/{job_id}/cancel")
async def cancel_ai_job(
    job_id: str,
    authorized: bool = Depends(verify_api_key)
):
    """Cancel a running AI job

    Args:
        job_id: Job identifier
        authorized: API key authorization

    Returns:
        Success status
    """
    plugin = plugin_manager.get("ai-playground")

    if not plugin:
        raise HTTPException(status_code=501, detail="AI Playground plugin not found")

    success = plugin.cancel_job(job_id)

    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")

    return {"success": True, "message": "Job cancelled"}


# Note: SSE streaming endpoint will be added in a separate task
# For now, job status is polled via GET /job/{job_id}/status
```

**Step 2: Verify the API file**

```bash
cat H:/Web/ozon-front/dev/ozon-backen/app/api/v1/ai.py
```

Expected: API router with endpoints defined.

**Step 3: Update the v1 `__init__.py` to include AI routes**

Modify `app/api/v1/__init__.py`:

```python
"""API v1 module"""

from app.api.v1 import health, image, ozon, ai

__all__ = ["health", "image", "ozon", "ai"]
```

**Step 4: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add app/api/v1/ai.py app/api/v1/__init__.py
git commit -m "feat: add AI Playground API endpoints"
```

---

### Task 4: Register Plugin and Routes in main.py

**Files:**
- Modify: `app/main.py`

**Step 1: Add the AI Playground plugin and routes**

Read the current `main.py` content and modify:

```python
"""FastAPI application entry point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health, image, ozon, ai
from app.plugins.plugin_manager import plugin_manager
from app.plugins.image.compress import ImageCompressPlugin
from app.plugins.ozon.download import OzonDownloadPlugin
from app.plugins.ai.playground import AiPlaygroundPlugin
from app.core.config import settings
from app.core.logger import setup_logging

# Setup logging
setup_logging()

# Create FastAPI app
app = FastAPI(
    title="Python Capability Service",
    version="2.1.0",
    description="Stateless processing capabilities - backend only handles heavy lifting"
)

# CORS middleware - use environment-specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register plugins
compress_plugin = ImageCompressPlugin(config=settings.plugins_config)
plugin_manager.register(compress_plugin)

ozon_download_plugin = OzonDownloadPlugin(config=settings.plugins_config.get("ozon-download", {}))
plugin_manager.register(ozon_download_plugin)

# Register AI Playground plugin
ai_playground_config = {
    "api_base": settings.plugins_config.get("ai", {}).get("api_base", ""),
    "api_key": settings.plugins_config.get("ai", {}).get("api_key", ""),
    "model": settings.plugins_config.get("ai", {}).get("model", ""),
    "target_width": settings.plugins_config.get("ai", {}).get("target_width", 1500),
    "target_height": settings.plugins_config.get("ai", {}).get("target_height", 2000),
    "default_temperature": settings.plugins_config.get("ai", {}).get("default_temperature", 0.5),
}
ai_playground_plugin = AiPlaygroundPlugin(config=ai_playground_config)
plugin_manager.register(ai_playground_plugin)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(image.router, prefix="/api/v1/image", tags=["image"])
app.include_router(ozon.router, prefix="/api/v1", tags=["ozon"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])


# Startup/Shutdown events
@app.on_event("startup")
async def startup():
    """Initialize on application startup"""
    pass


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on application shutdown"""
    pass
```

**Step 2: Verify the changes**

```bash
cat H:/Web/ozon-front/dev/ozon-backen/app/main.py
```

Expected: AI plugin registered and routes included.

**Step 3: Update config to include AI settings**

Add AI configuration to environment or config:

```python
# In app/core/config.py, the Settings class already has plugins_config
# The AI configuration will be loaded from environment variables or YAML
```

**Step 4: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add app/main.py
git commit -m "feat: register AI Playground plugin and routes"
```

---

### Task 5: Add AI Configuration to Environment

**Files:**
- Modify: `.env.example` or documentation for environment setup

**Step 1: Create or update `.env.example`**

```bash
# AI Playground Configuration
AI_API_BASE=https://llmxapi.com/v1beta
AI_API_KEY=your_api_key_here
AI_MODEL=models/gemini-2.5-flash-image-preview
AI_TARGET_WIDTH=1500
AI_TARGET_HEIGHT=2000
AI_DEFAULT_TEMPERATURE=0.5
```

**Step 2: Update Settings class to support AI config**

The Settings class in `app/core/config.py` already has `plugins_config` which can load AI settings.

**Step 3: Create a plugins configuration YAML file**

Create `config/plugins.yaml`:

```yaml
# AI Playground Plugin Configuration
ai:
  api_base: "https://llmxapi.com/v1beta"
  api_key: "${AI_API_KEY}"
  model: "models/gemini-2.5-flash-image-preview"
  target_width: 1500
  target_height: 2000
  default_temperature: 0.5

# Image Compression Plugin Configuration
image-compress:
  max_file_size: 52428800  # 50MB

# Ozon Download Plugin Configuration
ozon-download:
  max_workers: 5
  timeout_sec: 20
  default_field: "offer_id"
```

**Step 4: Test configuration loading**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
python -c "from app.core.config import settings; print(settings.plugins_config)"
```

Expected: Dictionary with plugin configurations.

**Step 5: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add .env.example config/plugins.yaml
git commit -m "feat: add AI Playground configuration"
```

---

### Task 6: Test the Implementation

**Files:**
- Test: Manual testing via curl or Postman

**Step 1: Start the FastAPI server**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Step 2: Test health check**

```bash
curl http://localhost:8000/api/v1/health
```

Expected: JSON response showing ai-playground plugin in the plugins list.

**Step 3: Test job submission**

```bash
curl -X POST http://localhost:8000/api/v1/ai/job \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-123" \
  -d '{
    "job_id": "test-001",
    "user_id": "test-user",
    "type": "batch_optimization",
    "config": {
      "quality": "standard",
      "format": "webp",
      "maxSize": 1920
    },
    "source_image_urls": ["https://example.com/test.jpg"]
  }'
```

Expected: Job response with success status.

**Step 4: Test job status**

```bash
curl http://localhost:8000/api/v1/ai/job/test-001/status \
  -H "X-API-Key: dev-api-key-123"
```

Expected: Job progress information.

**Step 5: Test with the frontend**

1. Ensure frontend `.env.development` has correct PYTHON_SERVICE_URL
2. Start the Next.js frontend
3. Navigate to AI Playground page
4. Upload an image and submit a job
5. Verify job processes and results are displayed

**Step 6: Fix any issues**

If there are any issues, debug and fix:
- Check logs for errors
- Verify API key configuration
- Ensure R2 service is configured
- Check image download/upload functionality

**Step 7: Commit any fixes**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add -A
git commit -m "fix: address issues found during testing"
```

---

### Task 7: Add SSE Streaming for Real-time Progress (Optional Enhancement)

**Files:**
- Modify: `app/api/v1/ai.py`

**Step 1: Add SSE endpoint for job progress streaming**

```python
from fastapi.responses import StreamingResponse
import asyncio
import json


@router.get("/job/{job_id}/stream")
async def stream_ai_job_progress(
    job_id: str,
    authorized: bool = Depends(verify_api_key)
):
    """Stream job progress via Server-Sent Events

    Args:
        job_id: Job identifier
        authorized: API key authorization

    Returns:
        SSE stream with progress updates
    """
    plugin = plugin_manager.get("ai-playground")

    if not plugin:
        raise HTTPException(status_code=501, detail="AI Playground plugin not found")

    async def event_stream():
        """Generator for SSE events"""
        last_status = None
        while True:
            status = plugin.get_job_status(job_id)

            if not status:
                yield f"event: error\ndata: {json.dumps({'error': 'Job not found'})}\n\n"
                break

            # Only send if status changed
            if status != last_status:
                event_type = "progress" if status["status"] == "processing" else status["status"]
                yield f"event: {event_type}\ndata: {json.dumps(status)}\n\n"
                last_status = status.copy()

            # Stop if job is complete or failed
            if status["status"] in ("completed", "failed", "cancelled"):
                break

            await asyncio.sleep(0.5)  # Poll every 500ms

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
```

**Step 2: Verify SSE endpoint**

```bash
curl -N http://localhost:8000/api/v1/ai/job/test-001/stream \
  -H "X-API-Key: dev-api-key-123"
```

Expected: SSE stream with progress events.

**Step 3: Update frontend to use SSE (optional)**

The frontend already has SSE support in `subscribeToJobProgress`. Just ensure the URL format matches.

**Step 4: Commit**

```bash
cd H:/Web/ozon-front/dev/ozon-backen
git add app/api/v1/ai.py
git commit -m "feat: add SSE streaming for real-time job progress"
```

---

## Completion Checklist

After implementing all tasks, verify:

- [ ] Plugin is registered and shows in health check
- [ ] API routes are accessible and protected by API key
- [ ] Job submission works and returns immediately
- [ ] Jobs process asynchronously with correct results
- [ ] Job status endpoint returns current progress
- [ ] Job cancellation works
- [ ] R2 upload/downloads work correctly
- [ ] Frontend can successfully submit and track jobs
- [ ] All three job types work (background_replacement, batch_optimization, image_enhancement)
- [ ] Error handling is robust
- [ ] Logs are written for debugging

---

## Next Steps (Beyond This Plan)

1. **Add unit tests** for the AI processor and plugin
2. **Add integration tests** for API endpoints
3. **Add rate limiting** to prevent abuse
4. **Add job queue** for better concurrency control
5. **Add result caching** to avoid reprocessing same inputs
6. **Add more image processing options** based on user feedback
7. **Optimize performance** with better async handling
8. **Add monitoring/metrics** for processing times and success rates
