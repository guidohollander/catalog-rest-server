import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

export const runtime = 'nodejs';

const config = loadConfig();
const POLL_INTERVAL_MS = 1000;

interface LocalStudioLogEntry {
  line: string;
  lineNumber: number;
  cleaned?: boolean;
  originalLine?: string;
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

function cleanStudioLog(line: string): { cleaned: string; shouldSkip: boolean; originalLine: string } {
  const originalLine = line;
  let cleaned = line.trim();

  if (!cleaned) {
    return { cleaned: '', shouldSkip: true, originalLine };
  }

  if (/^\d+$/.test(cleaned) ||
      /^at\s/.test(cleaned) ||
      /^\s*at\s/.test(cleaned) ||
      /^Caused by:/.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }

  if (/Read \d+ local studio log lines/.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }

  if (cleaned.includes('externals =') || cleaned.includes('initial_externals =')) {
    return { cleaned: cleaned.substring(0, 100) + '... [externals list truncated]', shouldSkip: false, originalLine };
  }

  if (/^\/svn\//.test(cleaned)) {
    return { cleaned, shouldSkip: true, originalLine };
  }

  cleaned = cleaned
    .replace(/^-{10,}$/, '--- [separator] ---')
    .replace(/--username\s+\S+\s+--password\s+\S+/, '--username ***REDACTED*** --password ***REDACTED***')
    .replace(/(https?:\/\/[^\s]{50,})/g, (match) => {
      if (match.length > 80) {
        return match.substring(0, 77) + '...';
      }
      return match;
    })
    .replace(/Context=\[[^\]]+\]\s*\[([^\]]+)\]\s*-\s*/, 'Context=[$1] - ')
    .replace(/com\.microsoft\.sqlserver\.jdbc\.SQLServerException:\s*/, 'SQLServerException: ')
    .replace(/org\.springframework\./, 'o.s.')
    .replace(/java\.base\/java\./, 'java.')
    .replace(/java\.sql\/java\.sql\./, 'java.sql.');

  return { cleaned, shouldSkip: false, originalLine };
}

function parseJsonStudioLog(line: string): LocalStudioLogEntry | null {
  try {
    const obj = JSON.parse(line);
    const rawMessage: string = obj.message || '';
    const firstLine = rawMessage.split(/\r?\n/)[0]?.trim() || rawMessage.trim();

    let handlerName: string | undefined;
    const handlerMatch = rawMessage.match(/DebugHandler\s*\[([^\]]+)\]/);
    if (handlerMatch) {
      handlerName = handlerMatch[1];
    } else if (typeof obj.debughandlername === 'string') {
      handlerName = obj.debughandlername.trim();
    }

    let eventName: string | undefined;
    const eventMatch = rawMessage.match(/event\s+'([^']+)'/i);
    if (eventMatch) {
      eventName = eventMatch[1];
    } else if (typeof obj.eventname === 'string') {
      const ev = obj.eventname.replace(/[^\w\-:]/g, ' ').trim();
      eventName = ev || undefined;
    }

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
      lineNumber: 0,
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

async function tailFile(filePath: string, lineCount: number): Promise<TailResult> {
  const fileHandle = await fsp.open(filePath, 'r');
  const stats = await fileHandle.stat();
  const fileSize = stats.size;

  if (fileSize === 0) {
    await fileHandle.close();
    return { lines: [], estimatedTotalLines: 0 };
  }

  try {
    let position = fileSize;
    let lines: string[] = [];
    let buffer = '';
    const chunkSize = Math.min(8192, fileSize);
    let estimatedTotalLines = 0;
    let iterations = 0;
    const maxIterations = Math.ceil(fileSize / chunkSize) + 10;

    while (lines.length < lineCount && position > 0 && iterations < maxIterations) {
      iterations++;
      const readSize = Math.min(chunkSize, position);
      position -= readSize;
      const chunk = Buffer.alloc(readSize);
      await fileHandle.read(chunk, 0, readSize, position);
      const chunkText = chunk.toString('utf-8');
      buffer = chunkText + buffer;
      const chunkLines = buffer.split('\n');
      buffer = chunkLines.shift() || '';

      for (let i = chunkLines.length - 1; i >= 0; i--) {
        const line = chunkLines[i].trim();
        if (line) {
          lines.unshift(line);
          if (lines.length >= lineCount) break;
        }
      }

      if (lines.length >= lineCount) break;
    }

    if (buffer.trim() && lines.length < lineCount) {
      lines.unshift(buffer.trim());
    }

    if (lines.length > 0) {
      const avgLineLength = fileSize / lines.length * (lines.length / fileSize * position + lines.length);
      estimatedTotalLines = Math.round(fileSize / (avgLineLength || 100));
    }

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

async function resolveLogFile(logPath: string): Promise<string> {
  const stats = await fsp.stat(logPath);

  if (stats.isDirectory()) {
    const files = await fsp.readdir(logPath);
    if (files.includes('studio.json')) {
      return path.join(logPath, 'studio.json');
    }

    const logFiles = files
      .filter(file => file.endsWith('.log') || file.toLowerCase().includes('log'))
      .sort((a, b) => b.localeCompare(a));

    if (logFiles.length === 0) {
      throw new Error('No studio log files found in directory');
    }

    return path.join(logPath, logFiles[0]);
  }

  return logPath;
}

function processJsonLines(lines: string[], startLineNumber: number): LocalStudioLogEntry[] {
  const entries: LocalStudioLogEntry[] = [];
  let lineNumber = startLineNumber;
  for (const raw of lines) {
    const parsed = parseJsonStudioLog(raw);
    if (parsed) {
      lineNumber += 1;
      parsed.lineNumber = lineNumber;
      entries.push(parsed);
    }
  }
  return entries;
}

function processTextLines(lines: string[], clean: boolean, startLineNumber: number): LocalStudioLogEntry[] {
  const entries: LocalStudioLogEntry[] = [];
  let lineNumber = startLineNumber;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }

    if (clean) {
      const cleanResult = cleanStudioLog(trimmed);
      if (cleanResult.shouldSkip) {
        continue;
      }
      lineNumber += 1;
      entries.push({
        line: cleanResult.cleaned,
        lineNumber,
        cleaned: true,
        originalLine: cleanResult.originalLine,
      });
    } else {
      lineNumber += 1;
      entries.push({
        line: trimmed,
        lineNumber,
      });
    }
  }
  return entries;
}

function encodeSse(event: string, data: unknown): Uint8Array {
  const text = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(text);
}

function readChunk(filePath: string, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const stream = fs.createReadStream(filePath, {
      start,
      end: Math.max(end - 1, start),
      encoding: 'utf-8'
    });

    stream.on('data', chunk => {
      data += chunk;
    });

    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const clean = searchParams.get('clean') === 'true';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!config.services.localStudioLogs?.logPath) {
      return new NextResponse('Local studio log path not configured', { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date !== today) {
      return new NextResponse('Streaming is only available for the current date', { status: 400 });
    }

    let actualLogFile: string;
    try {
      actualLogFile = await resolveLogFile(config.services.localStudioLogs.logPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error resolving log file';
      logger.warn(`Local studio log stream resolve failed: ${message}`);
      return new NextResponse(message, { status: 404 });
    }

    const isJson = actualLogFile.toLowerCase().endsWith('.json');

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked'
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) => {
          controller.enqueue(encodeSse(event, data));
        };

        let lastSize = 0;
        let lastLineNumber = 0;
        let totalLinesEstimate = 0;
        let pendingRemainder = '';
        let isClosed = false;
        let pollingHandle: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          if (pollingHandle) {
            clearInterval(pollingHandle);
            pollingHandle = null;
          }
          try {
            controller.close();
          } catch {
            // ignore close errors
          }
        };

        request.signal.addEventListener('abort', () => {
          cleanup();
        });

        try {
          const stats = await fsp.stat(actualLogFile);
          lastSize = stats.size;

          const tailResult = await tailFile(actualLogFile, limit);
          const startingLine = Math.max(0, tailResult.estimatedTotalLines - tailResult.lines.length);

          const initialEntries = isJson
            ? processJsonLines(tailResult.lines, startingLine)
            : processTextLines(tailResult.lines, clean, startingLine);

          lastLineNumber = initialEntries.length > 0
            ? initialEntries[initialEntries.length - 1].lineNumber
            : startingLine;
          totalLinesEstimate = Math.max(tailResult.estimatedTotalLines, lastLineNumber);

          send('init', {
            logs: initialEntries,
            metadata: {
              path: actualLogFile,
              date,
              lineCount: initialEntries.length,
              readAt: new Date().toISOString(),
              totalLinesInFile: totalLinesEstimate,
              limited: tailResult.estimatedTotalLines > limit,
              method: 'stream',
              cleaned: clean,
              format: isJson ? 'json' : 'text'
            }
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error during initial stream read';
          logger.error(`Local studio log stream initial read failed: ${message}`);
          send('logError', { message });
          cleanup();
          return;
        }

        pollingHandle = setInterval(async () => {
          if (isClosed) {
            return;
          }

          try {
            const stats = await fsp.stat(actualLogFile);

            if (stats.size < lastSize) {
              lastSize = stats.size;
              lastLineNumber = 0;
              totalLinesEstimate = 0;
              pendingRemainder = '';
              send('reset', {
                reason: 'truncated',
                metadata: {
                  path: actualLogFile,
                  date,
                  lineCount: 0,
                  readAt: new Date().toISOString(),
                  totalLinesInFile: 0,
                  method: 'stream',
                  cleaned: clean,
                  format: isJson ? 'json' : 'text'
                }
              });
            }

            if (stats.size > lastSize) {
              const chunk = await readChunk(actualLogFile, lastSize, stats.size);
              lastSize = stats.size;

              const combinedText = pendingRemainder + chunk;
              const rawLines = combinedText.split(/\r?\n/);
              pendingRemainder = rawLines.pop() || '';

              const newEntries = isJson
                ? processJsonLines(rawLines, lastLineNumber)
                : processTextLines(rawLines, clean, lastLineNumber);

              if (newEntries.length > 0) {
                lastLineNumber = newEntries[newEntries.length - 1].lineNumber;
              }

              totalLinesEstimate += rawLines.length;

              if (newEntries.length > 0) {
                send('update', {
                  logs: newEntries,
                  metadata: {
                    path: actualLogFile,
                    date,
                    lineCount: newEntries.length,
                    readAt: new Date().toISOString(),
                    totalLinesInFile: totalLinesEstimate,
                    method: 'stream',
                    cleaned: clean,
                    append: true,
                    format: isJson ? 'json' : 'text'
                  }
                });
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown streaming error';
            logger.warn(`Local studio log stream polling error: ${message}`);
            send('logError', { message });
          }
        }, POLL_INTERVAL_MS);
      },
      cancel() {
        // When the ReadableStream consumer cancels
      }
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Local studio log stream handler failed: ${message}`);
    return new NextResponse(message, { status: 500 });
  }
}
