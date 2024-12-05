import { NextRequest, NextResponse } from 'next/server';

export function validateBasicAuth(request: NextRequest): boolean {
  // Get the Authorization header
  const authHeader = request.headers.get('authorization');
  
  console.log('Authorization Header:', authHeader);
  console.log('REST_API_USERNAME:', process.env.REST_API_USERNAME);
  console.log('REST_API_PASSWORD:', process.env.REST_API_PASSWORD);

  if (!authHeader) {
    console.log('No authorization header');
    return false;
  }

  // Check if it's a Basic Auth header
  if (!authHeader.startsWith('Basic ')) {
    console.log('Not a Basic Auth header');
    return false;
  }

  // Decode the base64 encoded credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  console.log('Decoded Username:', username);
  console.log('Decoded Password:', password);

  // Compare with environment variables
  const isValid = (
    username === process.env.REST_API_USERNAME && 
    password === process.env.REST_API_PASSWORD
  );

  console.log('Authentication Result:', isValid);

  return isValid;
}

export function basicAuthMiddleware(request: NextRequest) {
  // Remove public routes, so all routes require authentication
  const publicRoutes: string[] = [];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Validate Basic Auth
  if (!validateBasicAuth(request)) {
    console.log('Authentication Failed');
    // Return a 401 Unauthorized response with WWW-Authenticate header
    return new NextResponse(
      JSON.stringify({ 
        error: 'Unauthorized', 
        status: 'error',
        details: {
          username: process.env.REST_API_USERNAME,
          passwordSet: !!process.env.REST_API_PASSWORD
        }
      }), 
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
