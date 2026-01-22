import { envConfigs } from '@/config';

const PYTHON_API_URL = envConfigs.python_api_url || 'http://localhost:8000';
const PYTHON_API_KEY = envConfigs.python_api_key || '';

function buildHeaders() {
  if (!PYTHON_API_KEY) {
    throw new Error('PYTHON_API_KEY is not configured');
  }
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PYTHON_API_KEY,
  };
}

export async function submitImageStudioJob(payload: Record<string, any>) {
  console.log('[ImageStudio Server] Submitting job to FastAPI', {
    jobId: payload.job_id,
    mode: payload.mode,
    skuCount: payload.options?.skus?.length || 0,
  });

  try {
    // Add timeout controller (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${PYTHON_API_URL}/api/v1/image-studio/jobs`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageStudio Server] FastAPI response error', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`ImageStudio API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[ImageStudio Server] FastAPI response success', {
      jobId: payload.job_id,
      hasData: !!result.data,
    });

    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[ImageStudio Server] Request timeout', { jobId: payload.job_id });
      throw new Error('请求超时：批量任务处理时间过长，请减少SKU数量或联系管理员');
    }

    console.error('[ImageStudio Server] Request failed', {
      jobId: payload.job_id,
      error: error?.message || error,
    });
    throw error;
  }
}

export async function getImageStudioJobStatus(jobId: string) {
  const response = await fetch(`${PYTHON_API_URL}/api/v1/image-studio/jobs/${jobId}/status`, {
    headers: {
      'X-API-Key': PYTHON_API_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function cancelImageStudioJob(jobId: string) {
  const response = await fetch(`${PYTHON_API_URL}/api/v1/image-studio/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: {
      'X-API-Key': PYTHON_API_KEY,
    },
  });

  return response.ok;
}

export async function getImageStudioJobLogs(jobId: string, query: string) {
  const response = await fetch(`${PYTHON_API_URL}/api/v1/image-studio/jobs/${jobId}/logs${query}`, {
    headers: {
      'X-API-Key': PYTHON_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImageStudio log error ${response.status}: ${errorText}`);
  }

  return response.json();
}
