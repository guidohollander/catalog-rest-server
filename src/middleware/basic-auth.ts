import { NextRequest, NextResponse } from 'next/server';

export function basicAuthMiddleware(request: NextRequest) {
  // Simply allow all requests to pass through
  return NextResponse.next();
}