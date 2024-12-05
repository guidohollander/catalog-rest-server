import { NextRequest, NextResponse } from 'next/server';

export function apiKeyMiddleware(request: NextRequest) {
  // Allow all requests to pass through
  return NextResponse.next();
}
