import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';

export function middleware(request: NextRequest) {
  // Exclude health routes from authentication
  if (
    request.nextUrl.pathname === '/api/health' ||
    request.nextUrl.pathname === '/api/svn/health'
  ) {
    return NextResponse.next();
  }

  // Only apply Basic Authentication to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return basicAuthMiddleware(request);
  }
  
  // Allow other routes to pass through
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};
