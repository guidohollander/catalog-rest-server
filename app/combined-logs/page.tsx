'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface InternalLogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
  source: 'internal';
  displayIndex: number;
}

const STREAM_LIMIT = 500;

interface ExternalLogEntry {
  line: string;
  lineNumber: number;
  adjustedLine?: string;
  source: 'external';
  timestamp?: string; // Extracted timestamp for sorting
  kv?: Record<string, string>;
  level?: string;
  handlerName?: string;
  eventName?: string;
}

type CombinedLogEntry = InternalLogEntry | ExternalLogEntry;

interface ExternalLogMetadata {
  url?: string;
  path?: string;
  date: string;
  lineCount: number;
  downloadedAt?: string;
  readAt?: string;
  timezoneOffset?: string;
}

export default function CombinedLogsPage() {
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [isProduction, setIsProduction] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<{ internal: boolean; external: boolean | null }>({ internal: false, external: false });
  const [externalMetadata, setExternalMetadata] = useState<ExternalLogMetadata | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [internalLogs, setInternalLogs] = useState<InternalLogEntry[]>([]);
  const [externalLogs, setExternalLogs] = useState<ExternalLogEntry[]>([]);
  const [environmentChecked, setEnvironmentChecked] = useState(false);
  const [externalStreamStatus, setExternalStreamStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [externalStreamError, setExternalStreamError] = useState<string | null>(null);
  const [internalStreamStatus, setInternalStreamStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [internalStreamError, setInternalStreamError] = useState<string | null>(null);
  const internalEventSourceRef = useRef<EventSource | null>(null);
  const externalEventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const previousLogsLength = useRef(0);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [cleanLogs, setCleanLogs] = useState(true);
  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const shouldUseStreaming = environmentChecked && !isProduction && selectedDate === todayString;
  const combinedLogs = useMemo<CombinedLogEntry[]>(() => {
    const merged: CombinedLogEntry[] = [...internalLogs, ...externalLogs];

    const getTimestamp = (log: CombinedLogEntry): number => {
      if (log.source === 'internal') {
        return new Date(log.timestamp).getTime();
      }

      const externalLog = log as ExternalLogEntry;

      if (externalLog.timestamp) {
        const parsed = new Date(externalLog.timestamp).getTime();
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }

      const extracted = extractTimestamp(externalLog.line || externalLog.adjustedLine || '', selectedDate);
      if (extracted) {
        return extracted.getTime();
      }

      const baseDate = new Date(selectedDate + 'T00:00:00.000Z');
      return baseDate.getTime() + (externalLog.lineNumber * 100);
    };

    return merged.sort((a, b) => getTimestamp(a) - getTimestamp(b));
  }, [internalLogs, externalLogs, selectedDate]);

  const clearInternalStream = useCallback(() => {
    if (internalEventSourceRef.current) {
      internalEventSourceRef.current.close();
      internalEventSourceRef.current = null;
    }
    setInternalStreamStatus('idle');
    setInternalStreamError(null);
  }, []);

  const clearExternalStream = useCallback(() => {
    if (externalEventSourceRef.current) {
      externalEventSourceRef.current.close();
      externalEventSourceRef.current = null;
    }
    setExternalStreamStatus('idle');
    setExternalStreamError(null);
  }, []);

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(text);
      setTimeout(() => setCopyFeedback(null), 2000); // Hide after 2 seconds
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  // Function to parse and highlight DebugHandler patterns
  const parseDebugHandler = (text: string): Array<{type: 'text' | 'debugHandler', content: string, methodName?: string}> => {
    const debugHandlerRegex = /DebugHandler\s+\[([^\]]+)\]/g;
    const parts: Array<{type: 'text' | 'debugHandler', content: string, methodName?: string}> = [];
    let lastIndex = 0;
    let match;

    while ((match = debugHandlerRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add the DebugHandler part
      parts.push({
        type: 'debugHandler',
        content: match[0], // Full match: "DebugHandler [methodName]"
        methodName: match[1] || '' // Just the method name, fallback to empty string
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderTextWithEventCopy = (text: string, eventName: string | undefined, key: string): JSX.Element => {
    if (!eventName) {
      return <span key={key}>{text}</span>;
    }

    const possibleTokens = [`'${eventName}'`, `"${eventName}"`, eventName];
    const token = possibleTokens.find(candidate => text.includes(candidate));

    if (!token) {
      return <span key={key}>{text}</span>;
    }

    const safeEventName = eventName;
    const segments = text.split(token);
    const nodes: JSX.Element[] = [];

    segments.forEach((segment, idx) => {
      if (segment) {
        nodes.push(
          <span key={`${key}-seg-${idx}`}>{segment}</span>
        );
      }

      if (idx < segments.length - 1) {
        nodes.push(
          <button
            key={`${key}-btn-${idx}`}
            onClick={() => copyToClipboard(safeEventName)}
            className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
            title={`Click to copy event name: ${safeEventName}`}
          >
            <span className="mr-1">{safeEventName}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        );
      }
    });

    return <span key={key} className="inline-flex flex-wrap items-center gap-1">{nodes}</span>;
  };

  // Function to extract timestamp from external log line
  const extractTimestamp = (logLine: string, selectedDate: string, offset?: string): Date | null => {
    // Look for HH:mm:ss,SSS format (common in studio logs)
    let timeMatch = logLine.match(/(\d{2}:\d{2}:\d{2},\d{3})/);
    
    // If not found, try HH:mm:ss format without milliseconds
    if (!timeMatch) {
      timeMatch = logLine.match(/(\d{2}:\d{2}:\d{2})/);
    }
    
    if (timeMatch) {
      let time, ms = '000';
      
      if (timeMatch[1].includes(',')) {
        [time, ms] = timeMatch[1].split(',');
      } else {
        time = timeMatch[1];
      }
      
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

  // Handle scroll position to detect if user is at bottom
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
      setIsAutoScrolling(isAtBottom);
      setScrollPosition(scrollTop);
    }
  }, []);

  // Preserve scroll position during refresh
  const preserveScrollPosition = useCallback(() => {
    if (containerRef.current && !isAutoScrolling) {
      const newLogsAdded = combinedLogs.length > previousLogsLength.current;
      if (newLogsAdded) {
        const scrollDiff = (combinedLogs.length - previousLogsLength.current) * 25;
        containerRef.current.scrollTop = scrollPosition + scrollDiff;
      } else {
        containerRef.current.scrollTop = scrollPosition;
      }
    }
    previousLogsLength.current = combinedLogs.length;
  }, [combinedLogs.length, isAutoScrolling, scrollPosition]);

  const fetchCombinedLogs = useCallback(async (preserveScroll = false) => {
    // Save current scroll position before refresh
    if (preserveScroll && containerRef.current) {
      setScrollPosition(containerRef.current.scrollTop);
    }
    
    setIsLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/logs', {
          signal: AbortSignal.timeout(10000)
        })
      ];

      if (!isProduction) {
        requests.push(
          fetch(`/api/local-studio-logs?date=${selectedDate}&limit=500&clean=${cleanLogs}`, {
            signal: AbortSignal.timeout(3000)
          })
        );
      }

      const responses = await Promise.all(requests);
      const [internalResponse, studioResponse] = responses;

      let nextInternalLogs: InternalLogEntry[] = [];
      let nextExternalLogs: ExternalLogEntry[] = [];

      if (internalResponse.ok) {
        const internalData = await internalResponse.json();
        if (!internalData.error && Array.isArray(internalData)) {
          nextInternalLogs = internalData.map((log: any, index: number): InternalLogEntry => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            metadata: log.metadata,
            source: 'internal',
            displayIndex: index + 1
          }));
          if (!shouldUseStreaming) {
            setIsConnected(prev => ({ ...prev, internal: true }));
          }
        } else {
          setIsConnected(prev => ({ ...prev, internal: false }));
        }
      } else {
        setIsConnected(prev => ({ ...prev, internal: false }));
      }

      if (!isProduction && studioResponse) {
        if (studioResponse.ok) {
          const studioData = await studioResponse.json();
          if (!studioData.error && Array.isArray(studioData.logs)) {
            nextExternalLogs = studioData.logs.map((entry: any): ExternalLogEntry => {
              const rawLine = typeof entry.line === 'string' ? entry.line : '';
              const adjustedLine = typeof entry.adjustedLine === 'string' ? entry.adjustedLine : rawLine;
              const inferredTimestamp = extractTimestamp(rawLine || adjustedLine || '', selectedDate)?.toISOString();

              return {
                line: rawLine,
                lineNumber: typeof entry.lineNumber === 'number' ? entry.lineNumber : 0,
                adjustedLine,
                source: 'external',
                timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : inferredTimestamp,
                kv: entry.kv,
                level: entry.level,
                handlerName: entry.handlerName,
                eventName: entry.eventName
              };
            });

            setExternalMetadata(studioData.metadata);
            setIsConnected(prev => ({ ...prev, external: true }));
          } else {
            setExternalMetadata(null);
            setIsConnected(prev => ({ ...prev, external: false }));
          }
        } else if (studioResponse && !studioResponse.ok) {
          setExternalMetadata(null);
          setIsConnected(prev => ({ ...prev, external: false }));
        } else if (!shouldUseStreaming) {
          setExternalMetadata(null);
          setIsConnected(prev => ({ ...prev, external: false }));
        }
      } else {
        if (!isProduction) {
          setExternalMetadata(null);
        }
        setIsConnected(prev => ({ ...prev, external: isProduction ? null : false }));
      }

      if (!shouldUseStreaming) {
        setInternalLogs(nextInternalLogs);
      }
      if (!shouldUseStreaming && (!isProduction || studioResponse)) {
        setExternalLogs(nextExternalLogs);
      }

    } catch (error) {
      console.error('Failed to fetch combined logs:', error);
      
      // Handle timeout errors specifically
      if (error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))) {
        console.warn('Request timed out - studio logs may be too large or slow to read');
        setIsConnected({ internal: true, external: false }); // Keep internal logs working
      } else {
        setIsConnected({ internal: false, external: false });
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, isProduction, cleanLogs, shouldUseStreaming]);

  // Effect to handle scroll position after logs update
  useEffect(() => {
    if (isAutoScrolling && logsEndRef.current) {
      // Auto-scroll to bottom if user was at bottom
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Preserve scroll position
      preserveScrollPosition();
    }
  }, [combinedLogs, isAutoScrolling, preserveScrollPosition]);

  // Auto-refresh effect
  useEffect(() => {
    if (!environmentChecked || shouldUseStreaming) {
      return;
    }
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchCombinedLogs(true); // Pass true to preserve scroll
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
  }, [autoRefresh, refreshInterval, selectedDate, fetchCombinedLogs, shouldUseStreaming, environmentChecked]);

  useEffect(() => {
    if (!shouldUseStreaming) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoRefresh) {
      setAutoRefresh(false);
    }
  }, [shouldUseStreaming, autoRefresh]);

  // Date change effect
  useEffect(() => {
    setInternalLogs([]);
    setExternalLogs([]);
    setIsAutoScrolling(true); // Reset to auto-scroll on date change
    fetchCombinedLogs();
  }, [selectedDate, fetchCombinedLogs]);

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Environment detection effect
  useEffect(() => {
    if (environmentChecked) {
      return;
    }

    const checkEnvironment = async () => {
      try {
        const response = await fetch('/api/environment');
        if (response.ok) {
          const data = await response.json();
          setIsProduction(data.isProduction);
        }
      } catch (error) {
        console.error('Failed to check environment:', error);
      } finally {
        setEnvironmentChecked(true);
      }
    };

    checkEnvironment();
  }, [environmentChecked]);

  useEffect(() => {
    if (!shouldUseStreaming) {
      clearInternalStream();
      return;
    }

    const streamUrl = `/api/logs/stream?limit=${STREAM_LIMIT}`;
    const source = new EventSource(streamUrl);
    internalEventSourceRef.current = source;
    setInternalStreamStatus('connecting');
    setInternalStreamError(null);

    const handleInit = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { logs: InternalLogEntry[] }; // SSE always sends string data
        setInternalLogs(payload.logs);
        setIsConnected(prev => ({ ...prev, internal: true }));
        setInternalStreamStatus('connected');
      } catch (err) {
        console.error('Failed to parse init payload', err);
        setInternalStreamStatus('error');
        setInternalStreamError('Failed to initialise internal log stream');
      }
    };

    const handleUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { logs: InternalLogEntry[] };
        if (Array.isArray(payload.logs) && payload.logs.length > 0) {
          setInternalLogs(prev => [...prev, ...payload.logs]);
        }
        setIsConnected(prev => ({ ...prev, internal: true }));
      } catch (err) {
        console.error('Failed to parse update payload', err);
        setInternalStreamStatus('error');
        setInternalStreamError('Failed to parse internal log update');
      }
    };

    const handleReset = () => {
      setInternalLogs([]);
      setInternalStreamStatus('connected');
    };

    const handleLogError = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { message?: string };
        const message = payload.message || 'Internal log streaming error';
        setInternalStreamStatus('error');
        setInternalStreamError(message);
      } catch (err) {
        setInternalStreamStatus('error');
        setInternalStreamError('Internal log streaming error');
      }
    };

    source.addEventListener('init', handleInit as EventListener);
    source.addEventListener('update', handleUpdate as EventListener);
    source.addEventListener('reset', handleReset as EventListener);
    source.addEventListener('logError', handleLogError as EventListener);

    source.onerror = (event) => {
      console.error('Internal log stream connection error', event);
      setInternalStreamStatus('error');
      setInternalStreamError('Internal log stream connection lost');
    };

    return () => {
      source.removeEventListener('init', handleInit as EventListener);
      source.removeEventListener('update', handleUpdate as EventListener);
      source.removeEventListener('reset', handleReset as EventListener);
      source.removeEventListener('logError', handleLogError as EventListener);
      clearInternalStream();
    };
  }, [shouldUseStreaming, clearInternalStream, environmentChecked]);

  const clearLogs = () => {
    setInternalLogs([]);
    setExternalLogs([]);
  };

  const clearStudioLogs = async () => {
    if (!confirm('Are you sure you want to clear the Be Informed Studio log file? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/local-studio-logs/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Clear the displayed logs and refresh
        setInternalLogs([]);
        setExternalLogs([]);
        setExternalMetadata(null);
        
        // Show success feedback
        setCopyFeedback('Studio log file cleared');
        setTimeout(() => setCopyFeedback(null), 3000);
        
        // Refresh logs after a short delay
        setTimeout(() => {
          fetchCombinedLogs(true);
        }, 1000);
      } else {
        console.error('Failed to clear studio logs:', result.error);
        setCopyFeedback('Failed to clear studio logs');
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    } catch (error) {
      console.error('Error clearing studio logs:', error);
      setCopyFeedback('Error clearing studio logs');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const refreshLogs = () => {
    fetchCombinedLogs(true); // Preserve scroll on manual refresh
  };

  const filteredLogs = useMemo<CombinedLogEntry[]>(() => combinedLogs.filter((log: CombinedLogEntry) => {
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
  }), [combinedLogs, filter, levelFilter, sourceFilter]);

  const lastExternalLogIndex = useMemo(() => (
    filteredLogs.reduce<number>((lastIndex, log, idx) => (
      log.source === 'external' ? idx : lastIndex
    ), -1)
  ), [filteredLogs]);

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
                <option value="external">{isProduction ? 'External Only' : 'Studio Logs Only'}</option>
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

            {!isProduction && (
              <button
                onClick={clearStudioLogs}
                className="px-4 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                title="Clear the actual Be Informed Studio log file"
              >
                Clear Studio Log File
              </button>
            )}
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
              <input
                type="checkbox"
                id="autoScroll"
                checked={isAutoScrolling}
                onChange={(e) => setIsAutoScrolling(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoScroll" className="text-sm text-gray-300">Auto-scroll to bottom</label>
            </div>

            {!isProduction && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="cleanLogs"
                  checked={cleanLogs}
                  onChange={(e) => setCleanLogs(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="cleanLogs" className="text-sm text-gray-300">Clean studio logs</label>
              </div>
            )}

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
              <div>{isProduction ? 'External Source' : 'Studio Log Source'}: <span className="text-blue-400">{externalMetadata.path || externalMetadata.url}</span></div>
              <div>{isProduction ? 'External' : 'Studio'} Lines: <span className="text-green-400">{externalMetadata.lineCount}</span>
                   {(externalMetadata as any).totalLinesInFile && (externalMetadata as any).totalLinesInFile > externalMetadata.lineCount && (
                     <span className="text-orange-400"> (tail: last {externalMetadata.lineCount} of {(externalMetadata as any).totalLinesInFile})</span>
                   )}
                   {(externalMetadata as any).cleaned && (
                     <span className="text-purple-400"> (cleaned)</span>
                   )} | 
                   {(externalMetadata as any).method === 'tail' ? 'Tailed' : externalMetadata.downloadedAt ? 'Downloaded' : 'Read'}: <span className="text-yellow-400">{formatDate(externalMetadata.downloadedAt || externalMetadata.readAt || '')}</span>
                   {externalMetadata.timezoneOffset && (
                     <span> | Timezone: <span className="text-purple-400">{externalMetadata.timezoneOffset}</span></span>
                   )}
              </div>
            </div>
          )}
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Copied: <code className="bg-green-700 px-1 rounded">{copyFeedback}</code></span>
            </div>
          </div>
        )}

        {/* Logs Container */}
        <div className="relative">
          <div 
            ref={containerRef}
            className="bg-black rounded-lg p-2 h-[70vh] overflow-y-auto font-mono leading-tight w-full"
            style={{ 
              scrollBehavior: 'smooth',
              fontFamily: 'Consolas, "Courier New", monospace',
              fontSize: '12px'
            }}
          >
            {/* Scroll to bottom indicator */}
            {!isAutoScrolling && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={() => {
                    setIsAutoScrolling(true);
                    if (logsEndRef.current) {
                      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-xs shadow-lg transition-colors"
                  title="Scroll to bottom and enable auto-scroll"
                >
                  ↓ Bottom
                </button>
              </div>
            )}
          {filteredLogs.length === 0 ? (
            <div className="text-green-400 text-center py-8">
              {isLoading ? 'Loading logs...' : combinedLogs.length === 0 ? 'No logs available. Click "Refresh" to load logs.' : 'No logs match the current filter'}
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
                const logText = log.adjustedLine || log.line;
                const parsedParts = parseDebugHandler(logText);
                const ts = (log as any).timestamp ? new Date((log as any).timestamp) : null;
                const tsText = ts ? `${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}:${String(ts.getSeconds()).padStart(2,'0')},${String(ts.getMilliseconds()).padStart(3,'0')}` : null;
                const kv = (log as any).kv as Record<string, string> | undefined;
                const eventName = (log as any).eventName as string | undefined;
                const handlerName = parsedParts.find(part => part.type === 'debugHandler')?.methodName;
                const extLevel: string = ((log as any).level || '').toString().toLowerCase();
                const logColor = 
                  extLevel === 'error' ? 'text-red-400' :
                  extLevel === 'warn' || extLevel === 'warning' ? 'text-yellow-400' :
                  extLevel === 'info' ? 'text-cyan-400' :
                  'text-green-400';

                let cleanedText = logText;
                if (handlerName) {
                  cleanedText = cleanedText.replace(new RegExp(`DebugHandler\\s+\\[${escapeRegExp(handlerName)}\\]\\s*`, 'i'), '');
                }
                if (eventName) {
                  cleanedText = cleanedText.replace(new RegExp(`event\\s+'${escapeRegExp(eventName)}'`, 'i'), 'event');
                  cleanedText = cleanedText.replace(new RegExp(`event\\s+"${escapeRegExp(eventName)}"`, 'i'), 'event');
                  cleanedText = cleanedText.replace(new RegExp(escapeRegExp(eventName), 'g'), eventName);
                }
                cleanedText = cleanedText.replace(/Dumping event data for event\s*/i, '');
                cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();

                const summaryElements = (eventName || handlerName) ? (
                  <span className="inline-flex flex-wrap items-center gap-2 mr-2 align-middle">
                    {eventName && (
                      <>
                        <span className="text-purple-300 text-xs uppercase tracking-widest">Event</span>
                        <button
                          onClick={() => copyToClipboard(eventName)}
                          className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
                          title={`Click to copy event name: ${eventName}`}
                        >
                          <span className="mr-1">{eventName}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </>
                    )}
                    {handlerName && (
                      <>
                        <span className="text-orange-400 text-xs uppercase tracking-widest">DebugHandler</span>
                        <button
                          onClick={() => copyToClipboard(handlerName)}
                          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
                          title={`Click to copy debug handler: ${handlerName}`}
                        >
                          <span className="mr-1">{handlerName}</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </span>
                ) : null;

                return (
                  <div key={`external-${log.lineNumber}-${index}`} className="mb-0">
                    <div className={`flex items-start ${logColor}`}>
                      <span className="text-gray-800 w-12 flex-shrink-0 text-right mr-2 whitespace-nowrap bg-green-300 bg-opacity-80 px-1 rounded">
                        {log.lineNumber}
                      </span>
                      <span className="flex-1 break-all">
                        {/* Timestamp (from JSON logs) */}
                        {tsText && (
                          <span className="text-gray-400 mr-2">{tsText}</span>
                        )}
                        {/* Level badge (align with internal style) */}
                        {extLevel && (
                          <span className="uppercase tracking-wide text-xs mr-2 opacity-80">[{extLevel}]</span>
                        )}
                        {summaryElements}
                        {cleanedText && (
                          <span>{renderTextWithEventCopy(cleanedText, eventName, `text-${index}`)}</span>
                        )}

                        {/* KV details table if present (JSON logs) */}
                        {kv && (() => {
                          const entries = Object.entries(kv);
                          if (entries.length === 0) {
                            return null;
                          }

                          const isLatestExternal = index === lastExternalLogIndex;
                          const fieldLabel = `Event data (${entries.length} field${entries.length === 1 ? '' : 's'})`;

                          return (
                            <details
                              className="ml-2 inline-flex align-middle bg-gray-900/50 rounded border border-gray-800/80"
                              open={isLatestExternal}
                            >
                              <summary className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 text-xs text-gray-400 hover:text-gray-200">
                                {fieldLabel}
                                {!isLatestExternal && (
                                  <span className="text-[10px] uppercase tracking-widest text-gray-500">(click to expand)</span>
                                )}
                              </summary>
                              <div className="px-3 pb-3">
                                <table className="w-full text-xs text-gray-200 table-fixed border-separate border-spacing-y-1">
                                  <tbody>
                                    {entries.map(([k, v]) => (
                                      <tr key={k} className="align-top">
                                        <td className="w-1/3 pr-3 text-gray-300 whitespace-nowrap">{k}</td>
                                        <td className="text-gray-100 break-all">{v}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          );
                        })()}
                      </span>
                    </div>
                  </div>
                );
              }
            })
          )}
          <div ref={logsEndRef} />
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 text-xs text-gray-400 flex justify-between">
          <span>
            Showing {filteredLogs.length} of {combinedLogs.length} logs
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
