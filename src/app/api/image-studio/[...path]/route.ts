/**
 * ImageStudio catch-all proxy
 * Forwards requests to the backend base URL.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

function buildBackendUrl(request: NextRequest, pathSegments: string[]) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const path = pathSegments.join('/');
  return `${BACKEND_BASE}/${path}${query ? `?${query}` : ''}`;
}

async function forwardRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const url = buildBackendUrl(request, pathSegments);
  const headers = new Headers();
  const contentType = request.headers.get('content-type') || '';
  let body: BodyInit | undefined;

  if (!['GET', 'HEAD'].includes(method)) {
    if (contentType.includes('application/json')) {
      const data = await request.json();
      body = JSON.stringify(data);
      headers.set('Content-Type', 'application/json');
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const backendFormData = new FormData();
      for (const [key, value] of formData.entries()) {
        backendFormData.append(key, value);
      }
      body = backendFormData;
    } else if (contentType) {
      const buffer = await request.arrayBuffer();
      body = buffer;
      headers.set('Content-Type', contentType);
    }
  }

  const response = await fetch(url, { method, headers, body });
  const responseContentType = response.headers.get('content-type') || '';

  if (responseContentType.includes('application/json')) {
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }

  const buffer = await response.arrayBuffer();
  const responseHeaders = new Headers();
  if (responseContentType) {
    responseHeaders.set('Content-Type', responseContentType);
  }
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    responseHeaders.set('Content-Disposition', disposition);
  }

  return new NextResponse(buffer, { status: response.status, headers: responseHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forwardRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forwardRequest(request, path, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forwardRequest(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forwardRequest(request, path, 'DELETE');
}
