import { NextRequest, NextResponse } from 'next/server';
import { refreshComponentDependencies } from '@/src/services/svn-component-dependencies';
import { logger } from '@/src/utils/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const fromUrl = requestBody.request?.from_url;

    if (!fromUrl || typeof fromUrl !== 'string' || !fromUrl.trim()) {
      return NextResponse.json(
        {
          response: {
            success: '0',
            dependency_count: '0',
          },
        },
        { status: 400 },
      );
    }

    const result = await refreshComponentDependencies(fromUrl);

    return NextResponse.json({
      response: {
        success: '1',
        dependency_count: String(result.dependencyCount),
      },
    });
  } catch (error) {
    logger.error('Failed to refresh component dependencies', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        response: {
          success: '0',
          dependency_count: '0',
        },
      },
      { status: 500 },
    );
  }
}
