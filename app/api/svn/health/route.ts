import { NextResponse } from 'next/server';

async function checkSvnConnection() {
  const svnHost = process.env.SVN_HOST;
  const svnUsername = process.env.SVN_USERNAME;
  const svnPassword = process.env.SVN_PASSWORD;

  // Check if all required environment variables are set
  const missingVars = [];
  if (!svnHost) missingVars.push('SVN_HOST');
  if (!svnUsername) missingVars.push('SVN_USERNAME');
  if (!svnPassword) missingVars.push('SVN_PASSWORD');

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  try {
    // Ensure URL is properly formatted and svnHost is defined (we checked above but TypeScript needs this)
    if (!svnHost) {
      throw new Error('SVN_HOST is required');
    }

    let baseUrl = svnHost;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const SVN_REPOSITORY_PATH = '/svn/SOLUTIONCOMPONENTS';
    const url = `${baseUrl}${SVN_REPOSITORY_PATH}`;
    const authString = Buffer.from(`${svnUsername}:${svnPassword}`).toString('base64');
    
    console.log(`Checking SVN connection at: ${url}`);
    
    // nosecret - This is just the standard Authorization header name, not a secret
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': '*/*'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('SVN authentication failed - Invalid credentials');
      } else if (response.status === 404) {
        throw new Error('SVN repository not found - Check SVN_HOST');
      }
      throw new Error(`SVN connection failed: ${response.status} ${response.statusText}`);
    }

    return { url, status: response.status };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('SVN connection timed out - Check SVN_HOST or network connectivity');
      }
      if (error.message.includes('fetch failed')) {
        throw new Error('Failed to reach SVN server - Check SVN_HOST and network connectivity');
      }
      if (error.message.includes('Failed to parse URL')) {
        throw new Error('Invalid SVN host URL format - Check SVN_HOST');
      }
      throw error;
    }
    throw new Error('Failed to connect to SVN');
  }
}

export async function GET() {
  try {
    const result = await checkSvnConnection();
    return NextResponse.json({ 
      status: 'healthy', 
      message: 'SVN connection successful',
      host: process.env.SVN_HOST,
      url: result.url
    });
  } catch (error) {
    console.error('SVN health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Unknown error',
        host: process.env.SVN_HOST
      },
      { status: 503 }
    );
  }
}
