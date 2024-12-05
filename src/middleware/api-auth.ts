import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest): boolean {
  // Get the API key from the request headers
  const apiKey = request.headers.get('x-api-key');
  
  // Compare with the environment variable
  return apiKey === process.env.API_SECRET_KEY;
}

export function apiKeyMiddleware(request: NextRequest) {
  // Skip validation for certain routes if needed
  const publicRoutes = ['/api/health'];
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Validate API key
  if (!validateApiKey(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', status: 'error' }), 
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  return NextResponse.next();
}
