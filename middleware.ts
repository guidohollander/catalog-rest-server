import { NextRequest, NextResponse } from 'next/server';
import { basicAuthMiddleware } from '@/src/middleware/basic-auth';
import { trackRouteStats } from '@/src/middleware/stats-tracker';
import { middlewareLogger as logger } from './src/utils/middleware-logger';

// List of routes to exclude from authentication
const AUTH_EXCLUDED_ROUTES = new Set([
  '/',  // Root path (home page)
  '/docs',  // Documentation page
  '/database-diagram',  // Database diagram page
  '/external-logs',  // External logs page
  '/stats',  // Statistics page
  '/architecture',  // Architecture framework page
  '/api/health',
  '/api/svn/health',
  '/api/jira/health',
  '/api/jenkins/health',
  '/api/database-schema',  // Database schema API
  '/api/external-logs',  // External logs API
  '/api/local-studio-logs',  // Local studio logs API
  '/api/local-studio-logs/clear',  // Clear local studio logs API
  '/api/local-studio-logs/stream',  // Streaming local studio logs API
  '/api/logs/stream',  // Streaming internal logs API
  '/api/environment',  // Environment API
  '/api/stats',  // Statistics API
  '/api/version',  // Version API
  '/api/weather',  // Weather API
  '/api/test-debug'  // Test endpoint for debugging
]);

// Cache for auth responses
const AUTH_CACHE = new Map<string, { response: NextResponse; timestamp: number }>();
const AUTH_CACHE_TTL = 60000; // 1 minute cache TTL

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const isProduction = process.env.NODE_ENV === 'production';

  // Block external and combined logs on AWS (production environment)
  if (isProduction && (pathname === '/external-logs' || pathname === '/combined-logs' || pathname === '/api/external-logs')) {
    return NextResponse.json(
      { 
        error: 'External and combined logs are not available in production environment',
        message: 'These features require VPN access and are disabled on AWS'
      },
      { status: 404 }
    );
  }

  // Apply Basic Authentication to protected routes (API routes and specific pages)
  const needsAuth = (pathname.startsWith('/api/') || pathname === '/logs' || pathname === '/external-logs' || pathname === '/combined-logs') && !AUTH_EXCLUDED_ROUTES.has(pathname);
  
  if (needsAuth) {
    // Check auth cache first
    const cacheKey = `${request.headers.get('authorization') || ''}-${pathname}`;
    const cachedAuth = AUTH_CACHE.get(cacheKey);
    
    if (cachedAuth && (Date.now() - cachedAuth.timestamp) < AUTH_CACHE_TTL) {
      // Track stats for authenticated routes that use cached auth
      return trackRouteStats(request, cachedAuth.response, true);
    }

    const response = await basicAuthMiddleware(request);
    
    // Cache successful auth responses
    if (response.status === 200) {
      AUTH_CACHE.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
    }
    
    // Track stats for authenticated routes
    return trackRouteStats(request, response, true);
  }

  // Track stats for public routes (but they won't be recorded due to isAuthenticatedRoute = false)
  const response = NextResponse.next();
  return trackRouteStats(request, response, false);
}

// Match all routes, not just API routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
