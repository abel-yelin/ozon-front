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
  const response = await fetch(`${PYTHON_API_URL}/api/v1/image-studio/jobs`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImageStudio API Error ${response.status}: ${errorText}`);
  }

  return response.json();
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
