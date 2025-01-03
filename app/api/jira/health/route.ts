import { NextResponse } from 'next/server';
import { loadConfig } from '@/src/config/loader';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

export async function GET() {
  try {
    const config = loadConfig();
    const { baseUrl } = config.services.jira;

    // Just try to reach Jira without authentication
    const response = await fetch(`${baseUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Even a 401 means Jira is reachable
    if (response.status === 401 || response.status === 403 || response.ok) {
      return NextResponse.json({
        status: 'healthy',
        message: 'Jira server is reachable',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      status: 'unhealthy',
      message: `Failed to connect to Jira: ${response.statusText}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Jira health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Failed to connect to Jira',
      timestamp: new Date().toISOString()
    });
  }
}
