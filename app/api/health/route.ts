import { NextRequest, NextResponse } from 'next/server';
import logger from '@/src/utils/logger';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export async function POST(request: NextRequest) {
  logger.debug('Health check request details:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  logger.info('Health check received');

  const response = { 
    status: true 
  };

  logger.debug('Health check response:', response);

  return NextResponse.json({ 
    response 
  }, { 
    status: 200 
  });
}

export async function GET(request: NextRequest) {
  logger.debug('Health check request details:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Read .env.example to get required variables
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const envExample = dotenv.parse(envExampleContent);
  const requiredEnvVars = Object.keys(envExample);

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const isHealthy = missingEnvVars.length === 0;

  logger.info('Health check received (GET)');

  const response = { 
    status: isHealthy,
    missingEnvVars: missingEnvVars
  };

  logger.debug('Health check response:', response);

  return NextResponse.json(response, { 
    status: isHealthy ? 200 : 503 
  });
}
