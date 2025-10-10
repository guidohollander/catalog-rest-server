import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const logPath = config.services.localStudioLogs?.logPath;
    
    if (!logPath) {
      return NextResponse.json({
        success: false,
        error: 'Local studio log path not configured'
      }, { status: 400 });
    }

    const filesToClear: string[] = [];
    
    try {
      // Check if the path is a directory or file
      const stats = await fs.stat(logPath);
      
      if (stats.isDirectory()) {
        // List all files in the directory and find log files
        const files = await fs.readdir(logPath);
        const studioJson = files.find(file => file.toLowerCase() === 'studio.json');
        if (studioJson) {
          filesToClear.push(path.join(logPath, studioJson));
        }

        const logFiles = files
          .filter(file => file.endsWith('.log') || file.toLowerCase().includes('log'))
          .sort((a, b) => b.localeCompare(a)); // Sort descending to get most recent first

        if (logFiles.length > 0) {
          // Clear the most recent log file to stay consistent with previous behaviour
          filesToClear.push(path.join(logPath, logFiles[0]));
        }
        
        if (filesToClear.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No studio log files found in directory'
          }, { status: 404 });
        }
      } else {
        // It's a file
        filesToClear.push(logPath);
      }
    } catch (error) {
      logger.warn(`Failed to access local studio logs at ${logPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return NextResponse.json({
        success: false,
        error: `Failed to access local studio logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }

    // Clear the log file(s) by writing empty content
    try {
      const clearedFiles: string[] = [];

      for (const filePath of Array.from(new Set(filesToClear))) {
        await fs.writeFile(filePath, '', 'utf-8');
        clearedFiles.push(filePath);
        logger.info(`Cleared local studio log file: ${filePath}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Studio log file(s) cleared successfully',
        clearedFiles,
        clearedAt: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error(`Failed to clear local studio log file(s) ${filesToClear.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return NextResponse.json({
        success: false,
        error: `Failed to clear log file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Local studio logs clear failed: ${errorMsg}`);
    
    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  }
}
