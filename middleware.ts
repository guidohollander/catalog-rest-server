import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';
import { middlewareLogger as logger } from './src/utils/middleware-logger';

// List of routes to exclude from authentication
const AUTH_EXCLUDED_ROUTES = new Set([
  '/',  // Root path (home page)
  '/docs',  // Documentation page
  '/database-diagram',  // Database diagram page
  '/api/health',
  '/api/svn/health',
  '/api/jira/health',
  '/api/jenkins/health',
  '/api/database-schema'  // Database schema API
]);

// Cache for auth responses
const AUTH_CACHE = new Map<string, { response: NextResponse; timestamp: number }>();
const AUTH_CACHE_TTL = 60000; // 1 minute cache TTL

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only apply Basic Authentication to API routes (excluding health)
  if (pathname.startsWith('/api/') && !AUTH_EXCLUDED_ROUTES.has(pathname)) {
    // Check auth cache first
    const cacheKey = `${request.headers.get('authorization') || ''}-${pathname}`;
    const cachedAuth = AUTH_CACHE.get(cacheKey);
    
    if (cachedAuth && (Date.now() - cachedAuth.timestamp) < AUTH_CACHE_TTL) {
      return cachedAuth.response;
    }

    const response = await basicAuthMiddleware(request);
    
    // Cache successful auth responses
    if (response.status === 200) {
      AUTH_CACHE.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
    }
    
    return response;
  }

  return NextResponse.next();
}

// Match all routes, not just API routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
