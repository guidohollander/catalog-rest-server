import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  console.log('Version API called');
  try {
    // Read package.json to get the current version
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    return NextResponse.json({
      version: packageJson.version,
      envVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'not set',
      buildTime: process.env.BUILD_TIME || 'unknown'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    );
  }
}
