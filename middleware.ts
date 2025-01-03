import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';

// List of routes to exclude from authentication
const AUTH_EXCLUDED_ROUTES = new Set([
  '/',  // Root path (home page)
  '/docs',  // Documentation page
  '/stats',  // Stats page
  '/api/health',
  '/api/svn/health',
  '/api/jira/health',
  '/api/jenkins/health',
  '/api/stats',
  '/api/stats/data',
  '/api/stats/authenticated'
]);

// List of routes to exclude from stats tracking
const STATS_EXCLUDED_ROUTES = new Set([
  '/api/stats',  // Prevent recursive stats tracking
  '/api/stats/data',
  '/api/stats/authenticated',
  '/_next',  // Next.js internal routes
  '/favicon.ico'
]);

// Cache for auth responses
const AUTH_CACHE = new Map<string, { response: NextResponse; timestamp: number }>();
const AUTH_CACHE_TTL = 60000; // 1 minute cache TTL

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Track route usage via API call for all routes except stats endpoints
  if (!STATS_EXCLUDED_ROUTES.has(pathname) && !pathname.startsWith('/_next')) {
    try {
      // Make API call to track stats
      fetch(`${request.nextUrl.origin}/api/stats/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          route: pathname, 
          method: method 
        })
      }).catch(error => console.error('Stats tracking error:', error));
    } catch (error) {
      // Log error but don't block the request
      console.error('Stats tracking error:', error);
    }
  }

  // Only apply Basic Authentication to API routes (excluding health and stats)
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
