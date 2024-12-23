import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';
import { updateRouteStats } from './app/utils/statsManager';

// List of routes to exclude from tracking and authentication
const EXCLUDED_ROUTES = [
  '/api/health',
  '/api/svn/health',
  '/api/jenkins/ping',
  '/api/stats',
  '/api/stats/data',
  '/api/stats/authenticated',
  '/stats'  // The stats page itself
];

// Optimize route checking with Set for O(1) lookup
const EXCLUDED_SET = new Set(EXCLUDED_ROUTES);

// Cache for auth responses
const AUTH_CACHE = new Map<string, { response: NextResponse; timestamp: number }>();
const AUTH_CACHE_TTL = 60000; // 1 minute cache TTL

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if route should be excluded from tracking using Set for O(1) lookup
  const isExcluded = EXCLUDED_SET.has(pathname);

  // Track all routes except excluded ones
  if (!isExcluded) {
    try {
      await updateRouteStats(pathname, method);
    } catch (error) {
      // Log error but don't block the request
      console.error('Stats tracking error:', error);
    }
  }

  // Only apply Basic Authentication to API routes (excluding health and stats)
  if (pathname.startsWith('/api/') && !isExcluded) {
    // Check auth cache first
    const cacheKey = `${request.headers.get('authorization') || ''}-${pathname}`;
    const cachedAuth = AUTH_CACHE.get(cacheKey);
    
    if (cachedAuth && (Date.now() - cachedAuth.timestamp) < AUTH_CACHE_TTL) {
      return cachedAuth.response;
    }

    const authResponse = await basicAuthMiddleware(request);
    if (authResponse.status !== 200) {
      // Cache failed auth responses
      AUTH_CACHE.set(cacheKey, { 
        response: authResponse, 
        timestamp: Date.now() 
      });
      return authResponse;
    }
  }
  
  // Allow the request to proceed
  return NextResponse.next();
}

// Match all routes, not just API routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
