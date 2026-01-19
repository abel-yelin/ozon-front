import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './core/i18n/config';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Apply next-intl middleware first
  const response = intlMiddleware(request);

  // Check if dashboard route needs protection
  const pathname = request.nextUrl.pathname;

  // Protect dashboard routes (excluding locale prefix)
  const dashboardPattern = /^\/[a-z]{2}\/dashboard\/.*/;
  if (dashboardPattern.test(pathname)) {
    // The dashboard layout already handles authentication
    // This middleware is just for additional protection if needed
    // The actual authentication check is in the layout itself
  }

  return response;
}

export const config = {
  // Match all pathnames except for those starting with:
  // - api (API routes)
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - static files (images, fonts, etc.)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
