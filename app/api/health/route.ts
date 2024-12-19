import { NextRequest, NextResponse } from 'next/server';
import logger from '@/src/utils/logger';

export async function POST(request: NextRequest) {
  logger.info('Health check received');
  return NextResponse.json({ 
    response: { 
      status: true 
    } 
  }, { 
    status: 200 
  });
}

export async function GET(request: NextRequest) {
  logger.info('Health check received (GET)');
  return NextResponse.json({ 
    response: { 
      status: true 
    } 
  }, { 
    status: 200 
  });
}
