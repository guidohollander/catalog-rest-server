import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory stats tracking for Edge Runtime compatibility
const statsQueue: Array<{
  pathname: string;
  method: string;
  timestamp: string;
}> = [];

export function trackRouteStats(request: NextRequest, response: NextResponse, isAuthenticatedRoute: boolean): NextResponse {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only track authenticated routes
  if (!isAuthenticatedRoute) {
    return response;
  }

  // Skip tracking for static files and Next.js internal routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') && !pathname.startsWith('/api/')
  ) {
    return response;
  }

  // Add to queue for processing by API route
  statsQueue.push({
    pathname,
    method,
    timestamp: new Date().toISOString()
  });

  // Keep queue size manageable (last 1000 requests)
  if (statsQueue.length > 1000) {
    statsQueue.splice(0, statsQueue.length - 1000);
  }

  return response;
}

// Export function to get queued stats (for API route to consume)
export function getQueuedStats() {
  return [...statsQueue];
}

// Export function to clear processed stats
export function clearProcessedStats(count: number) {
  statsQueue.splice(0, count);
}
