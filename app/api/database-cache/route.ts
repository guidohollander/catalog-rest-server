import { NextRequest, NextResponse } from 'next/server';
import { DatabaseCacheService } from '../../../src/services/database-cache';

export async function GET(request: NextRequest) {
  try {
    const cacheService = DatabaseCacheService.getInstance();
    const cacheStatus = await cacheService.getCacheStatus();
    
    return NextResponse.json({
      success: true,
      cacheStatus,
      message: cacheStatus.exists 
        ? `Cache exists, ${cacheStatus.isStale ? 'stale' : 'fresh'} (${Math.round((cacheStatus.age || 0) / (60 * 1000))} minutes old)`
        : 'No cache found'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const cacheService = DatabaseCacheService.getInstance();
    
    if (action === 'refresh') {
      console.log('🔄 Manual cache refresh requested');
      const result = await cacheService.refreshCache();
      
      return NextResponse.json({
        success: true,
        message: 'Cache refreshed successfully',
        data: {
          tableCount: result.metadata.tableCount,
          source: result.metadata.source,
          generatedAt: result.metadata.generatedAt
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Use "refresh" to refresh cache.'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Cache operation error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
