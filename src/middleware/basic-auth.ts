import { NextRequest, NextResponse } from 'next/server';

export function validateBasicAuth(request: NextRequest): boolean {
  // Comprehensive logging for debugging
  console.log('ENVIRONMENT DETAILS:');
  console.log('Node Environment:', process.env.NODE_ENV);
  console.log('Vercel Environment:', process.env.VERCEL_ENV);

  // Log ALL environment variables (be careful in production!)
  const sensitiveEnvVars = Object.keys(process.env)
    .filter(key => 
      key.includes('USERNAME') || 
      key.includes('PASSWORD') || 
      key.includes('API_KEY')
    )
    .reduce((acc, key) => {
      acc[key] = process.env[key];
      return acc;
    }, {} as Record<string, string | undefined>);

  console.log('SENSITIVE ENV VARS:', JSON.stringify(sensitiveEnvVars, null, 2));

  // Detailed header logging
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  console.log('ALL HEADERS:', JSON.stringify(allHeaders, null, 2));
  console.log('Request URL:', request.url);
  console.log('Request Method:', request.method);
  console.log('Request Pathname:', request.nextUrl.pathname);

  // Get the Authorization header
  const authHeader = request.headers.get('authorization');
  
  console.log('AUTHENTICATION DEBUG:');
  console.log('Authorization Header:', authHeader);
  console.log('REST_API_USERNAME from env:', process.env.REST_API_USERNAME);
  console.log('REST_API_PASSWORD from env:', process.env.REST_API_PASSWORD ? '[REDACTED]' : 'NOT SET');

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
    console.log('Authentication Failed for route:', request.nextUrl.pathname);
    // Return a 401 Unauthorized response with WWW-Authenticate header
    return new NextResponse(
      JSON.stringify({ 
        error: 'Unauthorized', 
        status: 'error',
        details: {
          route: request.nextUrl.pathname,
          username: process.env.REST_API_USERNAME,
          passwordSet: !!process.env.REST_API_PASSWORD,
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
          'WWW-Authenticate': 'Basic realm="Secure Area"'
        } 
      }
    );
  }

  return NextResponse.next();
}
