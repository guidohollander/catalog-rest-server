import { NextRequest, NextResponse } from 'next/server';
import { DatabaseCacheService } from '../../../src/services/database-cache';
import { logger } from '@/src/utils/logger';

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isCaseId: boolean;
    constraints: string[];
  }>;
  sampleData: any[];
  note?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
  
    return await getDatabaseSchema(forceRefresh);
  } catch (error) {
    console.error('Database schema error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      schema: '',
      tablesData: [],
      metadata: {
        tableCount: 0,
        version: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        source: 'error' as const,
        cacheStatus: { exists: false }
      }
    }, { status: 500 });
  }
}

async function getDatabaseSchema(forceRefresh: boolean = false): Promise<NextResponse> {
  try {
    const cacheService = DatabaseCacheService.getInstance();
    
    let result;
    if (forceRefresh) {
      result = await cacheService.refreshCache();
    } else {
      result = await cacheService.getDatabaseSchema();
    }
    
    // Add cache status to response
    const cacheStatus = await cacheService.getCacheStatus();
    
    return NextResponse.json({
      ...result,
      metadata: {
        ...result.metadata,
        cacheStatus
      }
    });
    
  } catch (error) {
    console.error('Database schema error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      schema: '',
      tablesData: [],
      metadata: {
        tableCount: 0,
        version: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        source: 'error' as const,
        cacheStatus: { exists: false }
      }
    }, { status: 500 });
  }
}
