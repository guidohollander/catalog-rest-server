import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

interface LocalStudioLogEntry {
  line: string;
  lineNumber: number;
  cleaned?: boolean;
  originalLine?: string;
  // Parsed fields for JSON logs (optional)
  timestamp?: string;
  handlerName?: string;
  eventName?: string;
  kv?: Record<string, string>;
  level?: string;
}

interface TailResult {
  lines: string[];
  estimatedTotalLines: number;
}

// Clean Be Informed Studio logs by removing noise and formatting better
function cleanStudioLog(line: string): { cleaned: string; shouldSkip: boolean; originalLine: string } {
  const originalLine = line;
  let cleaned = line.trim();
  
  // Skip empty lines
  if (!cleaned) {
    return { cleaned: '', shouldSkip: true, originalLine };
  }
  
  // Skip stack trace lines (lines starting with 'at ' or just numbers)
  if (/^\d+$/.test(cleaned) || 
      /^at\s/.test(cleaned) || 
      /^\s*at\s/.test(cleaned) ||
      /^Caused by:/.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }
  
  // Skip repetitive "Read X local studio log lines" messages (keep only unique ones)
  if (/Read \d+ local studio log lines/.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }
  
  // Skip very long externals dumps (keep first line only)
  if (cleaned.includes('externals =') || cleaned.includes('initial_externals =')) {
    return { cleaned: cleaned.substring(0, 100) + '... [externals list truncated]', shouldSkip: false, originalLine };
  }
  
  // Skip continuation lines of externals (lines starting with /svn/)
  if (/^\/svn\//.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }
  
  // Clean up common patterns
  cleaned = cleaned
    // Remove excessive dashes
    .replace(/^-{10,}$/, '--- [separator] ---')
    // Clean up SVN info commands (mask credentials)
    .replace(/--username\s+\S+\s+--password\s+\S+/, '--username ***REDACTED*** --password ***REDACTED***')
    // Shorten very long URLs
    .replace(/(https?:\/\/[^\s]{50,})/g, (match) => {
      if (match.length > 80) {
        return match.substring(0, 77) + '...';
      }
      return match;
    })
    // Clean up DebugHandler context information
    .replace(/Context=\[[^\]]+\]\s*\[([^\]]+)\]\s*-\s*/, 'Context=[$1] - ')
    // Simplify common error patterns
    .replace(/com\.microsoft\.sqlserver\.jdbc\.SQLServerException:\s*/, 'SQLServerException: ')
    .replace(/org\.springframework\./, 'o.s.')
    .replace(/java\.base\/java\./, 'java.')
    .replace(/java\.sql\/java\.sql\./, 'java.sql.');
  
  return { cleaned, shouldSkip: false, originalLine };
}

// Parse a single JSON log line from studio.json and extract structured info
function parseJsonStudioLog(line: string): LocalStudioLogEntry | null {
  try {
    const obj = JSON.parse(line);
    const rawMessage: string = obj.message || '';
    const firstLine = rawMessage.split(/\r?\n/)[0]?.trim() || rawMessage.trim();

    // Extract handler name from message like: DebugHandler [NAME]
    let handlerName: string | undefined;
    const handlerMatch = rawMessage.match(/DebugHandler\s*\[([^\]]+)\]/);
    if (handlerMatch) {
      handlerName = handlerMatch[1];
    } else if (typeof obj.debughandlername === 'string') {
      // Fallback to field
      handlerName = obj.debughandlername.trim();
    }

    // Extract event name from message: event 'evtName'
    let eventName: string | undefined;
    const eventMatch = rawMessage.match(/event\s+'([^']+)'/i);
    if (eventMatch) {
      eventName = eventMatch[1];
    } else if (typeof obj.eventname === 'string') {
      // Attempt to sanitize odd values
      const ev = obj.eventname.replace(/[^\w\-:]/g, ' ').trim();
      eventName = ev || undefined;
    }

    // Extract key/value pairs within the message block delimited by dashes
    // Matches lines like: key = 'value'
    const kv: Record<string, string> = {};
    const kvRegex = /\n\s*([\w\-]+)\s*=\s*'([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = kvRegex.exec(rawMessage)) !== null) {
      kv[m[1]] = m[2];
    }

    const level: string | undefined = (obj.level || obj['log.level'] || obj.severity || '').toString().toUpperCase() ||
      (handlerName ? 'DEBUG' : undefined);

    const entry: LocalStudioLogEntry = {
      line: firstLine || rawMessage.trim(),
      lineNumber: 0, // will be set by caller
      originalLine: rawMessage,
      timestamp: obj['@timestamp'] || undefined,
      handlerName,
      eventName,
      kv: Object.keys(kv).length ? kv : undefined,
      level,
    };
    return entry;
  } catch {
    return null;
  }
}

// Efficient tail implementation - reads from end of file with timeout protection
async function tailFile(filePath: string, lineCount: number): Promise<TailResult> {
  const fileHandle = await fs.open(filePath, 'r');
  const stats = await fileHandle.stat();
  const fileSize = stats.size;
  
  // Quick return for empty files
  if (fileSize === 0) {
    await fileHandle.close();
    return { lines: [], estimatedTotalLines: 0 };
  }
  
  try {
    // Start from the end and work backwards
    let position = fileSize;
    let lines: string[] = [];
    let buffer = '';
    const chunkSize = Math.min(8192, fileSize); // 8KB chunks or file size
    let estimatedTotalLines = 0;
    
    // Limit iterations to prevent infinite loops
    let iterations = 0;
    const maxIterations = Math.ceil(fileSize / chunkSize) + 10;
    
    while (lines.length < lineCount && position > 0 && iterations < maxIterations) {
      iterations++;
      
      // Calculate how much to read
      const readSize = Math.min(chunkSize, position);
      position -= readSize;
      
      // Read chunk from current position
      const chunk = Buffer.alloc(readSize);
      await fileHandle.read(chunk, 0, readSize, position);
      
      // Convert to string and prepend to buffer
      const chunkText = chunk.toString('utf-8');
      buffer = chunkText + buffer;
      
      // Split into lines
      const chunkLines = buffer.split('\n');
      
      // Keep the first part for next iteration (might be incomplete line)
      buffer = chunkLines.shift() || '';
      
      // Add lines to the beginning of our array (since we're reading backwards)
      for (let i = chunkLines.length - 1; i >= 0; i--) {
        const line = chunkLines[i].trim();
        if (line) {
          lines.unshift(line);
          if (lines.length >= lineCount) break;
        }
      }
      
      // Break early if we've read enough
      if (lines.length >= lineCount) break;
    }
    
    // Add any remaining buffer content as the first line
    if (buffer.trim() && lines.length < lineCount) {
      lines.unshift(buffer.trim());
    }
    
    // Estimate total lines based on average line length
    if (lines.length > 0) {
      const avgLineLength = fileSize / lines.length * (lines.length / fileSize * position + lines.length);
      estimatedTotalLines = Math.round(fileSize / (avgLineLength || 100));
    }
    
    // Ensure we don't exceed the requested line count
    if (lines.length > lineCount) {
      lines = lines.slice(-lineCount);
    }
    
    return {
      lines,
      estimatedTotalLines: Math.max(estimatedTotalLines, lines.length)
    };
  } finally {
    await fileHandle.close();
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const limit = parseInt(searchParams.get('limit') || '500'); // Reduced default limit for better performance
    const clean = searchParams.get('clean') === 'true'; // Enable log cleaning
    
    const logPath = config.services.localStudioLogs?.logPath;
    
    if (!logPath) {
      return NextResponse.json({
        error: 'Local studio log path not configured',
        logs: [],
        metadata: {
          path: 'not configured',
          date,
          lineCount: 0,
          readAt: new Date().toISOString()
        }
      });
    }

    // Find the most recent log file in the directory
    let actualLogFile = '';
    
    try {
      // Check if the path is a directory or file
      const stats = await fs.stat(logPath);
      
      if (stats.isDirectory()) {
        // Prefer studio.json if present
        const files = await fs.readdir(logPath);
        let chosen: string | undefined;
        if (files.includes('studio.json')) {
          chosen = 'studio.json';
        } else {
          const logFiles = files
            .filter(file => file.endsWith('.log') || file.toLowerCase().includes('log'))
            .sort((a, b) => b.localeCompare(a)); // Sort descending to get most recent first
          if (logFiles.length > 0) {
            chosen = logFiles[0];
          }
        }
        if (!chosen) {
          return NextResponse.json({
            error: 'No log files found in directory',
            logs: [],
            metadata: {
              path: logPath,
              date,
              lineCount: 0,
              readAt: new Date().toISOString(),
              totalLinesInFile: 0,
              fileSize: 0
            }
          });
        }
        actualLogFile = path.join(logPath, chosen);
      } else {
        // It's a file
        actualLogFile = logPath;
      }
    } catch (error) {
      logger.warn(`Failed to access local studio logs at ${logPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return NextResponse.json({
        error: `Failed to access local studio logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        logs: [],
        metadata: {
          path: logPath,
          date,
          lineCount: 0,
          readAt: new Date().toISOString()
        }
      });
    }

    // Implement efficient tail functionality - read from end of file
    let logs: LocalStudioLogEntry[] = [];
    let totalLines = 0;
    
    try {
      const fileStats = await fs.stat(actualLogFile);
      const fileSize = fileStats.size;
      
      if (fileSize === 0) {
        return NextResponse.json({
          logs: [],
          metadata: {
            path: actualLogFile,
            date,
            lineCount: 0,
            readAt: new Date().toISOString(),
            totalLinesInFile: 0,
            fileSize: 0
          }
        });
      }
      
      const isJson = actualLogFile.toLowerCase().endsWith('.json');
      // Efficient tail implementation - read from end of file with timeout
      const tailPromise = tailFile(actualLogFile, limit);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('File read timeout')), 2000); // 2 second timeout
      });
      
      const tailLines = await Promise.race([tailPromise, timeoutPromise]);
      totalLines = tailLines.estimatedTotalLines;
      
      // For JSON logs, do JSON-aware parsing; otherwise, treat as text
      if (isJson) {
        const entries: LocalStudioLogEntry[] = [];
        let lineNumber = totalLines - tailLines.lines.length + 1;
        for (const raw of tailLines.lines) {
          const parsed = parseJsonStudioLog(raw);
          if (parsed) {
            parsed.lineNumber = lineNumber;
            entries.push(parsed);
          }
          lineNumber++;
        }
        logs = entries;
      } else {
        // Filter by date if specified and not today (text logs only)
        let filteredLines = tailLines.lines;
        if (date !== new Date().toISOString().split('T')[0]) {
          const datePattern = new RegExp(date.replace(/-/g, '[-/]'));
          filteredLines = tailLines.lines.filter((line: string) => datePattern.test(line));
        }

        // Apply cleaning if requested and convert to log entries
        if (clean) {
          const cleanedEntries: LocalStudioLogEntry[] = [];
          let lineNumber = totalLines - filteredLines.length + 1;
          for (const line of filteredLines) {
            const cleanResult = cleanStudioLog(line);
            if (!cleanResult.shouldSkip) {
              cleanedEntries.push({
                line: cleanResult.cleaned,
                lineNumber: lineNumber,
                cleaned: true,
                originalLine: cleanResult.originalLine
              });
            }
            lineNumber++;
          }
          logs = cleanedEntries;
        } else {
          logs = filteredLines.map((line: string, index: number) => ({
            line: line.trim(),
            lineNumber: totalLines - filteredLines.length + index + 1
          }));
        }
      }
      
    } catch (error) {
      logger.warn(`Failed to read local studio logs from ${actualLogFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return NextResponse.json({
        error: `Failed to read local studio logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        logs: [],
        metadata: {
          path: actualLogFile,
          date,
          lineCount: 0,
          readAt: new Date().toISOString()
        }
      });
    }
    
    // Removed repetitive logging - was cluttering the logs
    
    return NextResponse.json({
      logs,
      metadata: {
        path: actualLogFile,
        date,
        lineCount: logs.length,
        readAt: new Date().toISOString(),
        totalLinesInFile: totalLines,
        limited: totalLines > limit,
        method: 'tail',
        cleaned: clean,
        format: actualLogFile.toLowerCase().endsWith('.json') ? 'json' : 'text'
      }
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Local studio logs read failed: ${errorMsg}`);
    
    return NextResponse.json({
      error: errorMsg,
      logs: [],
      metadata: {
        path: config.services.localStudioLogs?.logPath || 'not configured',
        date: new Date().toISOString().split('T')[0],
        lineCount: 0,
        readAt: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
