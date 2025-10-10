import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getQueuedStats, clearProcessedStats } from '@/src/middleware/stats-tracker';

export async function GET() {
  try {
    // Load existing stats from file
    const statsPath = path.join(process.cwd(), 'route-stats.json');
    let stats: any = {};
    
    try {
      const statsContent = await fs.readFile(statsPath, 'utf-8');
      stats = JSON.parse(statsContent);
    } catch (error) {
      // File doesn't exist yet, start with empty stats
      stats = {};
    }

    // Process queued stats from middleware
    const queuedStats = getQueuedStats();
    let hasNewStats = false;

    for (const stat of queuedStats) {
      if (!stats[stat.pathname]) {
        stats[stat.pathname] = {};
      }
      
      if (!stats[stat.pathname][stat.method]) {
        stats[stat.pathname][stat.method] = {
          count: 0,
          lastAccessed: stat.timestamp
        };
      }
      
      stats[stat.pathname][stat.method].count++;
      stats[stat.pathname][stat.method].lastAccessed = stat.timestamp;
      hasNewStats = true;
    }

    // Save updated stats back to file if we have new data
    if (hasNewStats) {
      await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
      clearProcessedStats(queuedStats.length);
    }
    
    // Calculate totals and add metadata
    let totalRequests = 0;
    let totalEndpoints = 0;
    const endpointStats = [];
    
    for (const [route, methods] of Object.entries(stats)) {
      let routeTotal = 0;
      const methodStats = [];
      
      for (const [method, data] of Object.entries(methods as any)) {
        const count = (data as any).count;
        const lastAccessed = (data as any).lastAccessed;
        
        routeTotal += count;
        totalRequests += count;
        
        methodStats.push({
          method,
          count,
          lastAccessed
        });
      }
      
      totalEndpoints++;
      endpointStats.push({
        route,
        totalRequests: routeTotal,
        methods: methodStats
      });
    }
    
    // Sort by total requests (descending)
    endpointStats.sort((a, b) => b.totalRequests - a.totalRequests);
    
    return NextResponse.json({
      summary: {
        totalRequests,
        totalEndpoints,
        generatedAt: new Date().toISOString()
      },
      endpoints: endpointStats
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset') {
      const statsPath = path.join(process.cwd(), 'route-stats.json');
      
      // Clear the stats file
      await fs.writeFile(statsPath, JSON.stringify({}, null, 2));
      
      // Clear any queued stats in memory
      const queuedStats = getQueuedStats();
      clearProcessedStats(queuedStats.length);
      
      return NextResponse.json({
        success: true,
        message: 'Statistics reset successfully'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset statistics' },
      { status: 500 }
    );
  }
}
