import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const STREAM_LIMIT = 200;
const POLL_INTERVAL_MS = 1000;

interface InternalLogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  source: 'internal';
  displayIndex: number;
}

interface TailResult {
  lines: string[];
  estimatedTotalLines: number;
}

const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, '').replace(/\[\[?\d+(?:;\d+)*m|\[39m|\[0m|\[22m|\[1m/g, '');

function parseLogLine(line: string, indexOffset: number): InternalLogEntry | null {
  const cleanLine = stripAnsi(line.trim());
  if (!cleanLine) {
    return null;
  }

  try {
    const parsed = JSON.parse(cleanLine);
    const timestamp = typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString();
    const level = typeof parsed.level === 'string' ? parsed.level : 'info';
    let message = parsed.message;
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    if (typeof message !== 'string') {
      message = String(message ?? '');
    }
    message = stripAnsi(message);

    const metadata: Record<string, unknown> = { ...parsed };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;

    const entry: InternalLogEntry = {
      timestamp,
      level,
      message,
      source: 'internal',
      displayIndex: indexOffset,
    };

    if (Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    return entry;
  } catch (error) {
    const fallbackMessage = stripAnsi(cleanLine);
    if (!fallbackMessage) {
      return null;
    }

    return {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: fallbackMessage,
      source: 'internal',
      displayIndex: indexOffset,
    };
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
      buffer = chunkLines.shift() ?? '';

      for (let i = chunkLines.length - 1; i >= 0; i--) {
        const line = chunkLines[i];
        if (line.trim()) {
          lines.unshift(line);
          if (lines.length >= lineCount) {
            break;
          }
        }
      }

      if (lines.length >= lineCount) {
        break;
      }
    }

    if (buffer.trim() && lines.length < lineCount) {
      lines.unshift(buffer.trim());
    }

    if (lines.length > lineCount) {
      lines = lines.slice(-lineCount);
    }

    estimatedTotalLines = Math.max(lines.length, Math.floor(fileSize / ((fileSize / Math.max(lines.length, 1)) || 100)));

    return {
      lines,
      estimatedTotalLines,
    };
  } finally {
    await fileHandle.close();
  }
}

function encodeSse(event: string, data: unknown): Uint8Array {
  const text = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(text);
}

async function resolveCombinedLogFile(): Promise<string> {
  const logsDir = process.env.NODE_ENV === 'production'
    ? '/app/logs'
    : path.join(process.cwd(), 'logs');

  const logFile = path.join(logsDir, 'combined.log');
  const exists = await fsp
    .stat(logFile)
    .then(stat => stat.isFile())
    .catch(() => false);

  if (!exists) {
    throw new Error('combined.log not found. Trigger some activity to generate internal logs first.');
  }

  return logFile;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    });

    const logFile = await resolveCombinedLogFile();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encodeSse(event, data));
        };

        let lastSize = 0;
        let lastDisplayIndex = 0;
        let pendingRemainder = '';
        let pollingHandle: NodeJS.Timeout | null = null;
        let closed = false;

        const cleanup = () => {
          if (closed) {
            return;
          }
          closed = true;
          if (pollingHandle) {
            clearInterval(pollingHandle);
            pollingHandle = null;
          }
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        request.signal.addEventListener('abort', () => cleanup());

        try {
          const stats = await fsp.stat(logFile);
          lastSize = stats.size;

          const tailResult = await tailFile(logFile, STREAM_LIMIT);

          const initialEntries: InternalLogEntry[] = [];
          let displayIndex = Math.max(0, tailResult.estimatedTotalLines - tailResult.lines.length);

          for (const line of tailResult.lines) {
            displayIndex += 1;
            const parsed = parseLogLine(line, displayIndex);
            if (parsed) {
              initialEntries.push(parsed);
            }
          }

          lastDisplayIndex = displayIndex;

          send('init', {
            logs: initialEntries,
            metadata: {
              path: logFile,
              lineCount: initialEntries.length,
              readAt: new Date().toISOString(),
              totalLinesInFile: tailResult.estimatedTotalLines,
              limited: tailResult.lines.length >= STREAM_LIMIT,
              method: 'stream',
              format: 'json',
            },
          });
        } catch (error) {
          send('logError', {
            message: error instanceof Error ? error.message : 'Failed to initialise log stream',
          });
          cleanup();
          return;
        }

        pollingHandle = setInterval(async () => {
          try {
            const stats = await fsp.stat(logFile);

            if (stats.size < lastSize) {
              lastSize = stats.size;
              lastDisplayIndex = 0;
              pendingRemainder = '';
              send('reset', {
                reason: 'truncated',
                metadata: {
                  path: logFile,
                  lineCount: 0,
                  readAt: new Date().toISOString(),
                  totalLinesInFile: 0,
                  method: 'stream',
                  format: 'json',
                },
              });
              return;
            }

            if (stats.size === lastSize) {
              return;
            }

            const chunk = await readChunk(logFile, lastSize, stats.size);
            lastSize = stats.size;

            const combined = pendingRemainder + chunk;
            const rawLines = combined.split(/\r?\n/);
            pendingRemainder = rawLines.pop() ?? '';

            const newEntries: InternalLogEntry[] = [];

            for (const rawLine of rawLines) {
              if (!rawLine.trim()) {
                continue;
              }
              lastDisplayIndex += 1;
              const parsed = parseLogLine(rawLine, lastDisplayIndex);
              if (parsed) {
                newEntries.push(parsed);
              }
            }

            if (newEntries.length > 0) {
              send('update', {
                logs: newEntries,
                metadata: {
                  path: logFile,
                  lineCount: newEntries.length,
                  readAt: new Date().toISOString(),
                  totalLinesInFile: lastDisplayIndex,
                  append: true,
                  method: 'stream',
                  format: 'json',
                },
              });
            }
          } catch (error) {
            send('logError', {
              message: error instanceof Error ? error.message : 'Streaming error',
            });
          }
        }, POLL_INTERVAL_MS);
      },
      cancel() {
        // Consumer cancelled the stream
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(message, { status: 500 });
  }
}

function readChunk(filePath: string, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const stream = fs.createReadStream(filePath, {
      start,
      end: Math.max(end - 1, start),
      encoding: 'utf-8',
    });

    stream.on('data', chunk => {
      data += chunk;
    });

    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}
