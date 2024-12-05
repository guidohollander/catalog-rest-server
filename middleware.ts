import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { basicAuthMiddleware } from './src/middleware/basic-auth';

export function middleware(request: NextRequest) {
  // Apply Basic Authentication middleware to protect routes
  return basicAuthMiddleware(request);
}

export const config = {
  matcher: '' // Remove authentication matcher
};
