import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';

// List of routes to exclude from authentication
const EXCLUDED_ROUTES = new Set([
  '/api/health',
  '/api/svn/health',
  '/api/jenkins/ping',
  '/api/stats',
  '/api/stats/data',
  '/api/stats/authenticated',
  '/stats'  // The stats page itself
]);

// Cache for auth responses
const AUTH_CACHE = new Map<string, { response: NextResponse; timestamp: number }>();
const AUTH_CACHE_TTL = 60000; // 1 minute cache TTL

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Track route usage via API call
  if (!EXCLUDED_ROUTES.has(pathname)) {
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
  if (pathname.startsWith('/api/') && !EXCLUDED_ROUTES.has(pathname)) {
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
