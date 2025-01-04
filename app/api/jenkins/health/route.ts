import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const jenkinsBaseUrl = config.services.jenkins.baseUrl;

export async function GET(): Promise<NextResponse> {
  const options = {
    hostname: jenkinsBaseUrl.replace('http://', ''),
    path: '/login',
    method: 'GET',
    timeout: 2000  // 2 seconds timeout
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 403) {
        // 403 is also OK as it means Jenkins is up but requires auth
        resolve(NextResponse.json({ status: 'ok' }));
      } else {
        resolve(NextResponse.json(
          { status: 'error', message: `Jenkins returned status ${res.statusCode}` },
          { status: 500 }
        ));
      }
    });

    req.on('error', (error) => {
      logger.error('Jenkins health check error:', error);
      resolve(NextResponse.json(
        { status: 'error', message: 'Failed to connect to Jenkins' },
        { status: 500 }
      ));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(NextResponse.json(
        { status: 'error', message: 'Jenkins health check timed out' },
        { status: 500 }
      ));
    });

    req.end();
  });
}
