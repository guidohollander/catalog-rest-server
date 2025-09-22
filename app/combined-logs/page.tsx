'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface InternalLogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
  source: 'internal';
  displayIndex: number;
}

interface ExternalLogEntry {
  line: string;
  lineNumber: number;
  adjustedLine?: string;
  source: 'external';
  timestamp?: string; // Extracted timestamp for sorting
}

type CombinedLogEntry = InternalLogEntry | ExternalLogEntry;

interface ExternalLogMetadata {
  url: string;
  date: string;
  lineCount: number;
  downloadedAt: string;
  timezoneOffset?: string;
}

export default function CombinedLogsPage() {
  const [logs, setLogs] = useState<CombinedLogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState({ internal: false, external: false });
  const [externalMetadata, setExternalMetadata] = useState<ExternalLogMetadata | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to extract timestamp from external log line
  const extractTimestamp = (logLine: string, selectedDate: string, offset?: string): Date | null => {
    // Look for HH:mm:ss,SSS format
    const timeMatch = logLine.match(/(\d{2}:\d{2}:\d{2},\d{3})/);
    if (timeMatch) {
      const [time, ms] = timeMatch[1].split(',');
      const [hours, minutes, seconds] = time.split(':').map(Number);
      
      // Use the selected date instead of today's date
      const date = new Date(selectedDate + 'T00:00:00.000Z');
      date.setUTCHours(hours, minutes, seconds, parseInt(ms));
      
      // Apply timezone offset if provided (but in reverse since we want to get back to UTC)
      if (offset) {
        const offsetMatch = offset.match(/^([+-])(\d+)([hm])$/);
        if (offsetMatch) {
          const [, sign, amount, unit] = offsetMatch;
          const multiplier = sign === '+' ? -1 : 1; // Reverse the offset to get back to original time
          const offsetMinutes = unit === 'h' ? parseInt(amount) * 60 : parseInt(amount);
          const offsetMs = multiplier * offsetMinutes * 60 * 1000;
          return new Date(date.getTime() + offsetMs);
        }
      }
      
      return date;
    }
    
    return null;
  };

  // Function to adjust timestamps in external logs
  const adjustTimestamp = (logLine: string, offset?: string): string => {
    if (!offset) return logLine;
    
    const offsetMatch = offset.match(/^([+-])(\d+)([hm])$/);
    if (!offsetMatch) return logLine;
    
    const [, sign, amount, unit] = offsetMatch;
    const multiplier = sign === '+' ? 1 : -1;
    const minutes = unit === 'h' ? parseInt(amount) * 60 : parseInt(amount);
    const offsetMs = multiplier * minutes * 60 * 1000;
    
    return logLine.replace(/(\d{2}:\d{2}:\d{2},\d{3})/g, (match) => {
      try {
        const [time, ms] = match.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        
        const date = new Date();
        date.setHours(hours, minutes, seconds, parseInt(ms));
        const adjustedDate = new Date(date.getTime() + offsetMs);
        
        const newHours = adjustedDate.getHours().toString().padStart(2, '0');
        const newMinutes = adjustedDate.getMinutes().toString().padStart(2, '0');
        const newSeconds = adjustedDate.getSeconds().toString().padStart(2, '0');
        const newMs = adjustedDate.getMilliseconds().toString().padStart(3, '0');
        
        return `${newHours}:${newMinutes}:${newSeconds},${newMs}`;
      } catch (e) {
        return match;
      }
    });
  };

  const fetchCombinedLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch both internal and external logs in parallel
      const [internalResponse, externalResponse] = await Promise.all([
        fetch('/api/logs'),
        fetch(`/api/external-logs?date=${selectedDate}`)
      ]);

      let internalLogs: InternalLogEntry[] = [];
      let externalLogs: ExternalLogEntry[] = [];

      // Process internal logs
      if (internalResponse.ok) {
        const internalData = await internalResponse.json();
        if (!internalData.error && Array.isArray(internalData)) {
          internalLogs = internalData.map((log: any, index: number) => ({
            ...log,
            source: 'internal' as const,
            displayIndex: index + 1
          }));
          setIsConnected(prev => ({ ...prev, internal: true }));
        } else {
          setIsConnected(prev => ({ ...prev, internal: false }));
        }
      } else {
        setIsConnected(prev => ({ ...prev, internal: false }));
      }

      // Process external logs
      if (externalResponse.ok) {
        const externalData = await externalResponse.json();
        if (!externalData.error && Array.isArray(externalData.logs)) {
          externalLogs = externalData.logs.map((log: any) => ({
            ...log,
            source: 'external' as const,
            adjustedLine: adjustTimestamp(log.line, externalData.metadata?.timezoneOffset),
            timestamp: extractTimestamp(log.line, selectedDate, externalData.metadata?.timezoneOffset)?.toISOString()
          }));
          setExternalMetadata(externalData.metadata);
          setIsConnected(prev => ({ ...prev, external: true }));
        } else {
          setIsConnected(prev => ({ ...prev, external: false }));
        }
      } else {
        setIsConnected(prev => ({ ...prev, external: false }));
      }

      // Combine and sort logs by timestamp
      const combinedLogs: CombinedLogEntry[] = [...internalLogs, ...externalLogs];
      
      // Sort by timestamp (oldest first - chronological order)
      combinedLogs.sort((a, b) => {
        const timeA = a.source === 'internal' ? new Date(a.timestamp) : (a.timestamp ? new Date(a.timestamp) : new Date(0));
        const timeB = b.source === 'internal' ? new Date(b.timestamp) : (b.timestamp ? new Date(b.timestamp) : new Date(0));
        return timeA.getTime() - timeB.getTime();
      });

      setLogs(combinedLogs);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        if (logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to fetch combined logs:', error);
      setIsConnected({ internal: false, external: false });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchCombinedLogs, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, selectedDate, fetchCombinedLogs]);

  // Date change effect
  useEffect(() => {
    setLogs([]);
    if (autoRefresh) {
      fetchCombinedLogs();
    }
  }, [selectedDate, autoRefresh, fetchCombinedLogs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const refreshLogs = () => {
    fetchCombinedLogs();
  };

  const filteredLogs = logs.filter(log => {
    // Text filter
    let matchesText = false;
    if (log.source === 'internal') {
      matchesText = filter === '' || 
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(filter.toLowerCase()));
    } else {
      matchesText = filter === '' || 
        (log.adjustedLine || log.line).toLowerCase().includes(filter.toLowerCase());
    }
    
    // Level filter (only applies to internal logs)
    const matchesLevel = levelFilter === 'all' || 
      (log.source === 'internal' && log.level === levelFilter) ||
      (log.source === 'external'); // External logs always pass level filter
    
    // Source filter
    const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
    
    return matchesText && matchesLevel && matchesSource;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#1a1b26] text-white p-4">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Combined Logs Console</h1>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected.internal ? 'text-blue-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected.internal ? 'bg-blue-400' : 'bg-red-400'}`}></div>
                <span className="text-sm">Internal</span>
              </div>
              <div className={`flex items-center space-x-2 ${isConnected.external ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected.external ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm">External</span>
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Filter:</label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search logs..."
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Level:</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="error">Error</option>
                <option value="warn">Warn</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Source:</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="internal">Internal Only</option>
                <option value="external">External Only</option>
              </select>
            </div>

            <button
              onClick={refreshLogs}
              disabled={isLoading}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>

            <button
              onClick={clearLogs}
              className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Clear Display
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-300">Auto-refresh</label>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Interval (seconds):</label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Math.max(5, parseInt(e.target.value) || 5))}
                min="5"
                max="300"
                className="w-20 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Metadata */}
          {externalMetadata && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>External Source: <span className="text-blue-400">{externalMetadata.url}</span></div>
              <div>External Lines: <span className="text-green-400">{externalMetadata.lineCount}</span> | 
                   Downloaded: <span className="text-yellow-400">{formatDate(externalMetadata.downloadedAt)}</span>
                   {externalMetadata.timezoneOffset && (
                     <span> | Timezone: <span className="text-purple-400">{externalMetadata.timezoneOffset}</span></span>
                   )}
              </div>
            </div>
          )}
        </div>

        {/* Logs Container */}
        <div 
          ref={containerRef}
          className="bg-black rounded-lg p-2 h-[70vh] overflow-y-auto font-mono leading-tight w-full"
          style={{ 
            scrollBehavior: 'smooth',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '12px'
          }}
        >
          {filteredLogs.length === 0 ? (
            <div className="text-green-400 text-center py-8">
              {isLoading ? 'Loading logs...' : logs.length === 0 ? 'No logs available. Click "Refresh" to load logs.' : 'No logs match the current filter'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              if (log.source === 'internal') {
                const logColor = 
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'info' ? 'text-cyan-400' :
                  'text-green-400';
                
                const metadataColor = 
                  log.level === 'error' ? 'text-red-300' :
                  log.level === 'warn' ? 'text-yellow-300' :
                  log.level === 'info' ? 'text-cyan-300' :
                  'text-green-300';

                // Format timestamp to match external logs (HH:mm:ss,SSS)
                const formatTimestamp = (isoString: string) => {
                  const date = new Date(isoString);
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  const seconds = date.getSeconds().toString().padStart(2, '0');
                  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
                  return `${hours}:${minutes}:${seconds},${milliseconds}`;
                };

                return (
                  <div key={`internal-${index}`} className="mb-0">
                    <div className={`flex items-start ${logColor}`}>
                      <span className="text-gray-800 w-12 flex-shrink-0 text-right mr-2 whitespace-nowrap bg-blue-300 bg-opacity-80 px-1 rounded">
                        {log.displayIndex}
                      </span>
                      <span className="whitespace-nowrap mr-2">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="font-bold uppercase mr-2 whitespace-nowrap">
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="flex-1 break-all">
                        {log.message}
                      </span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className={`ml-16 ${metadataColor}`}>
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="break-all">
                            <span className="opacity-75">{key}:</span> <span>{
                              typeof value === 'object' ? JSON.stringify(value) : String(value)
                            }</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={`external-${log.lineNumber}-${index}`} className="mb-0">
                    <div className="flex items-start text-cyan-400">
                      <span className="text-gray-800 w-12 flex-shrink-0 text-right mr-2 whitespace-nowrap bg-green-300 bg-opacity-80 px-1 rounded">
                        {log.lineNumber}
                      </span>
                      <span className="flex-1 break-all">
                        {log.adjustedLine || log.line}
                      </span>
                    </div>
                  </div>
                );
              }
            })
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Status Bar */}
        <div className="mt-4 text-xs text-gray-400 flex justify-between">
          <span>
            Showing {filteredLogs.length} of {logs.length} logs
            {filter && ` (filtered by "${filter}")`}
            {sourceFilter !== 'all' && ` (${sourceFilter} only)`}
          </span>
          <span>
            {autoRefresh && `Auto-refresh: ${refreshInterval}s`}
          </span>
        </div>
      </div>
    </div>
  );
}
