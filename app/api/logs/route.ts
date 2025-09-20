import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    // Simple ANSI regex instead of strip-ansi to avoid ES module issues
    const stripAnsi = (str: string) => {
      return str.replace(/\u001b\[[0-9;]*m/g, '').replace(/\[\[?\d+(?:;\d+)*m|\[39m|\[0m|\[22m|\[1m/g, '');
    };
    
    // Use different log directory based on environment
    const logsDir = process.env.NODE_ENV === 'production' 
      ? '/app/logs'  // Docker container path
      : join(process.cwd(), 'logs');  // Local development path
    
    const logFile = join(logsDir, 'combined.log');
    
    // Return empty array if log file doesn't exist yet
    if (!existsSync(logFile)) {
      return NextResponse.json([]);
    }

    // Read the entire file content (simplified for now)
    const fileContent = readFileSync(logFile, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Get the last 100 lines to avoid overwhelming the client
    const recentLines = lines.slice(-100);
    const logs: LogEntry[] = [];

    for (const line of recentLines) {
      try {
        // Parse Winston JSON format
        const logEntry = JSON.parse(line);
        
        // Format timestamp to be more readable
        const timestamp = logEntry.timestamp 
          ? new Date(logEntry.timestamp).toLocaleString('sv-SE').replace('T', ' ')
          : new Date().toLocaleString('sv-SE').replace('T', ' ');
        
        // Clean message from any remaining formatting
        let message = logEntry.message || '';
        if (typeof message === 'object') {
          message = JSON.stringify(message);
        }
        message = stripAnsi(String(message));
        
        const formattedLog: LogEntry = {
          timestamp,
          level: logEntry.level || 'info',
          message,
        };

        // Include other fields as metadata if they exist
        const otherFields = { ...logEntry };
        delete otherFields.timestamp;
        delete otherFields.level;
        delete otherFields.message;
        
        if (Object.keys(otherFields).length > 0) {
          formattedLog.metadata = otherFields;
        }

        logs.push(formattedLog);
      } catch (parseError) {
        // If line is not valid JSON, treat it as a plain message
        const cleanMessage = stripAnsi(line);
        if (cleanMessage.trim()) {
          logs.push({
            timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
            level: 'info',
            message: cleanMessage,
          });
        }
      }
    }

    return NextResponse.json(logs);
  } catch (error) {
    // Return a more detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to read logs', 
        details: error instanceof Error ? error.message : String(error),
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd()
      },
      { status: 500 }
    );
  }
}

// Reset endpoint (useful for development)
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: 'Log position reset' });
}
