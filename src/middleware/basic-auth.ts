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

  // Comprehensive logging for debugging Vercel SSO interference
  console.log('VERCEL SSO DEBUGGING:');
  
  // Log Vercel-specific headers
  const vercelHeaders = [
    'x-vercel-id',
    'x-vercel-deployment-url',
    'x-vercel-trace',
    'x-vercel-proxied-for'
  ];

  vercelHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      console.log(`${header}: ${value}`);
    }
  });

  // Hardcoded credentials for testing
  const HARDCODED_USERNAME = 'service_catalog_api';
  const HARDCODED_PASSWORD = 'service_catalog_api_remote';

  // Get the Authorization header
  const authHeader = request.headers.get('authorization');
  
  console.log('HARDCODED AUTH DEBUG:');
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
  console.log('Hardcoded Username:', HARDCODED_USERNAME);
  console.log('Hardcoded Password:', HARDCODED_PASSWORD ? '[REDACTED]' : 'NO PASSWORD');

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
  const publicRoutes: string[] = [];

  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Validate Basic Auth
  if (!validateBasicAuth(request)) {
    console.log('Authentication Failed for route:', request.nextUrl.pathname);
    
    // Attempt to bypass Vercel SSO
    return new NextResponse(
      JSON.stringify({ 
        error: 'Unauthorized', 
        status: 'error',
        details: {
          route: request.nextUrl.pathname,
          hardcodedUsername: 'service_catalog_api',
          username: process.env.REST_API_USERNAME,
          passwordSet: !!process.env.REST_API_PASSWORD,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV
          },
          vercelHeaders: {
            id: request.headers.get('x-vercel-id'),
            deploymentUrl: request.headers.get('x-vercel-deployment-url')
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
