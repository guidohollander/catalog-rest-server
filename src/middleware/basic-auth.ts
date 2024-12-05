import { NextRequest, NextResponse } from 'next/server';

export function validateBasicAuth(request: NextRequest): boolean {
  // Get the Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) return false;

  // Check if it's a Basic Auth header
  if (!authHeader.startsWith('Basic ')) return false;

  // Decode the base64 encoded credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Compare with environment variables
  return (
    username === process.env.REST_API_USERNAME && 
    password === process.env.REST_API_PASSWORD
  );
}

export function basicAuthMiddleware(request: NextRequest) {
  // Remove public routes, so all routes require authentication
  const publicRoutes: string[] = [];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Validate Basic Auth
  if (!validateBasicAuth(request)) {
    // Return a 401 Unauthorized response with WWW-Authenticate header
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized', status: 'error' }), 
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Basic realm="Secure Area"'
        } 
      }
    );
  }

  return NextResponse.next();
}
