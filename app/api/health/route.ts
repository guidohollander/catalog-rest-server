import { NextRequest, NextResponse } from 'next/server';
import logger from '@/src/utils/logger';

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

  logger.info('Health check received (GET)');

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
