import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('Health check received');
  return NextResponse.json({ 
    response: { 
      status: true 
    } 
  }, { 
    status: 200 
  });
}

export async function GET(request: NextRequest) {
  console.log('Health check received (GET)');
  return NextResponse.json({ 
    response: { 
      status: true 
    } 
  }, { 
    status: 200 
  });
}
