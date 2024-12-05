import { NextRequest, NextResponse } from 'next/server';

export function validateBasicAuth(request: NextRequest): boolean {
  console.log('VERCEL SSO DEBUGGING:');
  
  // Extensive header logging
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
    console.log(`Header - ${key}: ${value}`);
  });

  // Hardcoded credentials for testing
  const HARDCODED_USERNAME = process.env.BASIC_AUTH_USERNAME || 'service_catalog_api';
  const HARDCODED_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'service_catalog_api_remote';

  // Get the Authorization header
  const authHeader = request.headers.get('authorization');
  
  console.log('Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('BASIC_AUTH_USERNAME:', HARDCODED_USERNAME);
  console.log('BASIC_AUTH_PASSWORD:', HARDCODED_PASSWORD ? '[REDACTED]' : 'NOT SET');

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
  console.log('Decoded Password:', password ? '[REDACTED]' : 'NO PASSWORD');

  // Compare with hardcoded credentials
  const isValid = (
    username === HARDCODED_USERNAME && 
    password === HARDCODED_PASSWORD
  );

  console.log('Authentication Result:', isValid);

  return isValid;
}

export function basicAuthMiddleware(request: NextRequest) {
  // Remove public routes, so all routes require authentication
  const publicRoutes: string[] = ['/api/public'];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Validate Basic Auth
  if (!validateBasicAuth(request)) {
    console.log('Authentication Failed for route:', request.nextUrl.pathname);
    
    // Return a detailed 401 response
    return new NextResponse(
      JSON.stringify({ 
        error: 'Unauthorized', 
        status: 'error',
        details: {
          route: request.nextUrl.pathname,
          hardcodedUsername: process.env.BASIC_AUTH_USERNAME,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV
          }
        }
      }), 
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Basic realm="Secure Area"',
          // Attempt to prevent Vercel SSO redirect
          'X-Vercel-Bypass-SSO': 'true'
        } 
      }
    );
  }

  return NextResponse.next();
}
