import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const jenkinsBaseUrl = config.services.jenkins.baseUrl;

// Cache for health check results
interface HealthCache {
  data: any;
  status: number;
  timestamp: number;
}

let healthCache: HealthCache | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET(): Promise<NextResponse> {
  // Check if we have a valid cached result
  const now = Date.now();
  if (healthCache && (now - healthCache.timestamp) < CACHE_DURATION) {
    // Return cached result without logging
    return NextResponse.json(healthCache.data, { status: healthCache.status });
  }

  const options = {
    hostname: jenkinsBaseUrl.replace('http://', ''),
    path: '/login',
    method: 'GET',
    timeout: 2000  // 2 seconds timeout
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data: any;
      let status: number;
      
      if (res.statusCode === 200 || res.statusCode === 403) {
        // 403 is also OK as it means Jenkins is up but requires auth
        data = { status: 'ok' };
        status = 200;
        logger.info(`Jenkins health check: OK (status ${res.statusCode})`);
      } else {
        data = { status: 'error', message: `Jenkins returned status ${res.statusCode}` };
        status = 500;
        logger.warn(`Jenkins health check: ERROR (status ${res.statusCode})`);
      }
      
      // Cache the result
      healthCache = {
        data: data,
        status: status,
        timestamp: Date.now()
      };
      
      resolve(NextResponse.json(data, { status }));
    });

    req.on('error', (error) => {
      const errorCode = (error as any).code || 'unknown';
      logger.error(`Jenkins health check error: ${error.message}, code: ${errorCode}`);
      
      const data = { status: 'error', message: 'Failed to connect to Jenkins' };
      const status = 500;
      
      // Cache the error result
      healthCache = {
        data: data,
        status: status,
        timestamp: Date.now()
      };
      
      resolve(NextResponse.json(data, { status }));
    });

    req.on('timeout', () => {
      req.destroy();
      logger.warn('Jenkins health check timed out');
      
      const data = { status: 'error', message: 'Jenkins health check timed out' };
      const status = 500;
      
      // Cache the timeout result
      healthCache = {
        data: data,
        status: status,
        timestamp: Date.now()
      };
      
      resolve(NextResponse.json(data, { status }));
    });

    req.end();
  });
}
