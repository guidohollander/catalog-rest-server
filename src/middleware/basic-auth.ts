import { NextRequest, NextResponse } from 'next/server';

export function basicAuthMiddleware(request: NextRequest) {
  // Check for Basic Authentication header
  const authHeader = request.headers.get('authorization');
  
  // Retrieve credentials from environment variables
  const username = process.env.REST_API_USERNAME;
  const password = process.env.REST_API_PASSWORD;

  // If no credentials are set, allow all requests
  if (!username || !password) {
    return NextResponse.next();
  }

  // If no authorization header is present, request authentication
  if (!authHeader) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }), 
      { 
        status: 401, 
        headers: { 
          'WWW-Authenticate': 'Basic realm="Secure Area"',
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  // Decode the authorization header
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [providedUsername, providedPassword] = credentials.split(':');

  // Validate credentials
  if (
    providedUsername === username && 
    providedPassword === password
  ) {
    return NextResponse.next();
  }

  // Invalid credentials
  return new NextResponse(
    JSON.stringify({ error: 'Invalid credentials' }), 
    { 
      status: 401, 
      headers: { 
        'WWW-Authenticate': 'Basic realm="Secure Area"',
        'Content-Type': 'application/json' 
      } 
    }
  );
}