/**
 * ImageStudio Upload API Route
 * Handles file uploads to Python backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Create a new FormData to send to the backend
    const backendFormData = new FormData();

    // Transfer all entries from the incoming FormData
    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }

    const response = await fetch(`${BACKEND_BASE}/upload`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('ImageStudio upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
