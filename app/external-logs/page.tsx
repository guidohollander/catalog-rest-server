'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ExternalLogEntry {
  line: string;
  lineNumber: number;
  adjustedLine?: string; // Line with adjusted timestamp
}

interface LogMetadata {
  url: string;
  date: string;
  lineCount: number;
  downloadedAt: string;
  timezoneOffset?: string;
}

export default function ExternalLogsPage() {
  const [logs, setLogs] = useState<ExternalLogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [metadata, setMetadata] = useState<LogMetadata | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastLineCount, setLastLineCount] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to parse timezone offset and adjust timestamps
  const adjustTimestamp = (logLine: string, offset?: string): string => {
    if (!offset) return logLine;
    
    // Parse offset like "+6h", "-3h", "+30m", etc.
    const offsetMatch = offset.match(/^([+-])(\d+)([hm])$/);
    if (!offsetMatch) return logLine;
    
    const [, sign, amount, unit] = offsetMatch;
    const multiplier = sign === '+' ? 1 : -1;
    const minutes = unit === 'h' ? parseInt(amount) * 60 : parseInt(amount);
    const offsetMs = multiplier * minutes * 60 * 1000;
    
    // Look for timestamp patterns in the log line (common formats)
    const timestampPatterns = [
      // Your specific format: HH:mm:ss,SSS (like 11:11:08,121)
      /(\d{2}:\d{2}:\d{2},\d{3})/g,
      // ISO formats
      /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/g,
      // US formats
      /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/g,
      /(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})/g
    ];
    
    let adjustedLine = logLine;
    
    for (const pattern of timestampPatterns) {
      adjustedLine = adjustedLine.replace(pattern, (match) => {
        try {
          let date: Date;
          
          // Handle HH:mm:ss,SSS format specifically
          if (match.match(/^\d{2}:\d{2}:\d{2},\d{3}$/)) {
            // Parse HH:mm:ss,SSS format (assume today's date)
            const [time, ms] = match.split(',');
            const [hours, minutes, seconds] = time.split(':').map(Number);
            
            date = new Date();
            date.setHours(hours, minutes, seconds, parseInt(ms));
          } else {
            // Handle other formats
            date = new Date(match);
          }
          
          if (isNaN(date.getTime())) return match;
          
          const adjustedDate = new Date(date.getTime() + offsetMs);
          
          // Format back to original format
          if (match.includes(',')) {
            // HH:mm:ss,SSS format
            const hours = adjustedDate.getHours().toString().padStart(2, '0');
            const minutes = adjustedDate.getMinutes().toString().padStart(2, '0');
            const seconds = adjustedDate.getSeconds().toString().padStart(2, '0');
            const milliseconds = adjustedDate.getMilliseconds().toString().padStart(3, '0');
            return `${hours}:${minutes}:${seconds},${milliseconds}`;
          } else if (match.includes('T')) {
            return adjustedDate.toISOString().replace('T', ' ').replace('Z', '');
          } else if (match.includes('/')) {
            return adjustedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).replace(',', '');
          } else {
            return adjustedDate.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
          }
        } catch (e) {
          return match; // Return original if parsing fails
        }
      });
    }
    
    return adjustedLine;
  };

  const fetchLogs = async (showNewOnly = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/external-logs?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.error) {
          console.error('API Error:', data.error);
          setIsConnected(false);
          setMetadata(data.metadata);
          return;
        }
        
        const newLogs = data.logs || [];
        setMetadata(data.metadata);
        
        // Apply timezone adjustment to all logs
        const adjustedLogs = newLogs.map((log: ExternalLogEntry) => ({
          ...log,
          adjustedLine: adjustTimestamp(log.line, data.metadata?.timezoneOffset)
        }));
        
        if (showNewOnly && lastLineCount > 0) {
          // Only show new lines since last fetch
          const newLines = adjustedLogs.slice(lastLineCount);
          if (newLines.length > 0) {
            setLogs(prevLogs => [...prevLogs, ...newLines]);
            console.log(`Added ${newLines.length} new log lines`);
          }
        } else {
          // Full refresh
          setLogs(adjustedLogs);
        }
        
        setLastLineCount(newLogs.length);
        setIsConnected(true);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        
      } else {
        console.error('HTTP Error:', response.status, response.statusText);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Failed to fetch external logs:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchLogs(true); // Only show new lines
      }, refreshInterval * 1000);
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
  }, [autoRefresh, refreshInterval, selectedDate]);

  // Date change effect
  useEffect(() => {
    setLogs([]);
    setLastLineCount(0);
    if (autoRefresh) {
      fetchLogs(false); // Full refresh for new date
    }
  }, [selectedDate]);

  const clearLogs = () => {
    setLogs([]);
    setLastLineCount(0);
  };

  const refreshLogs = () => {
    setLogs([]);
    setLastLineCount(0);
    fetchLogs(false);
  };

  const filteredLogs = logs.filter(log => 
    filter === '' || log.line.toLowerCase().includes(filter.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold">External Application Logs</h1>
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
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
                onChange={(e) => setRefreshInterval(Math.max(5, parseInt(e.target.value) || 30))}
                min="5"
                max="300"
                className="w-20 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>Source: <span className="text-blue-400">{metadata.url}</span></div>
              <div>Lines: <span className="text-green-400">{metadata.lineCount}</span> | 
                   Downloaded: <span className="text-yellow-400">{formatDate(metadata.downloadedAt)}</span>
                   {metadata.timezoneOffset && (
                     <span> | Timezone: <span className="text-purple-400">{metadata.timezoneOffset}</span></span>
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
              {isLoading ? 'Loading logs...' : logs.length === 0 ? 'No logs available' : 'No logs match the current filter'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={`${log.lineNumber}-${index}`} className="mb-0">
                <div className="flex items-start text-cyan-400">
                  <span className="text-gray-800 w-12 flex-shrink-0 text-right mr-2 whitespace-nowrap bg-green-300 bg-opacity-80 px-1 rounded">
                    {log.lineNumber}
                  </span>
                  <span className="flex-1 break-all">
                    {log.adjustedLine || log.line}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Status Bar */}
        <div className="mt-4 text-xs text-gray-400 flex justify-between">
          <span>
            Showing {filteredLogs.length} of {logs.length} lines
            {filter && ` (filtered by "${filter}")`}
          </span>
          <span>
            {autoRefresh && `Auto-refresh: ${refreshInterval}s`}
          </span>
        </div>
      </div>
    </div>
  );
}
