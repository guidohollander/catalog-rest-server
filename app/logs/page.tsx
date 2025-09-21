'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastClearedTime, setLastClearedTime] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll for logs every 2 seconds
    const pollLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        if (response.ok) {
          const newLogs = await response.json();
          // Check if it's an error response
          if (newLogs.error) {
            console.error('API Error:', newLogs);
            setIsConnected(false);
            return;
          }
          
          setLogs(prevLogs => {
            if (!Array.isArray(newLogs)) return [];
            
            // If logs were cleared, only show logs newer than the clear time
            if (lastClearedTime) {
              const filteredLogs = newLogs.filter(log => {
                // Convert both timestamps to Date objects for proper comparison
                const logTime = new Date(log.timestamp);
                const clearTime = new Date(lastClearedTime);
                return logTime > clearTime;
              });
              console.log(`Filtered ${newLogs.length} logs to ${filteredLogs.length} after clear time ${lastClearedTime}`);
              return filteredLogs;
            }
            
            return newLogs;
          });
          setIsConnected(true);
        } else {
          console.error('HTTP Error:', response.status, response.statusText);
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    pollLogs();
    
    // Set up polling interval
    const interval = setInterval(pollLogs, 2000);

    return () => clearInterval(interval);
  }, [lastClearedTime]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
    setLastClearedTime(new Date().toISOString());
  };

  const filteredLogs = logs.filter(log => {
    const matchesText = filter === '' || 
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(filter.toLowerCase()));
    
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    
    return matchesText && matchesLevel;
  });


  return (
    <div className="min-h-screen bg-[#1a1b26] text-white p-4">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Live Logs Console</h1>
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4 flex flex-wrap items-center gap-4">
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
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoScroll" className="text-sm text-gray-300">Auto-scroll</label>
          </div>

          <button
            onClick={clearLogs}
            className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Clear Logs
          </button>

          <div className="text-sm text-gray-400">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>

        {/* Logs Container */}
        <div 
          ref={containerRef}
          className="bg-black rounded-lg p-2 h-[70vh] overflow-y-auto font-mono leading-tight w-full"
          style={{ 
            scrollBehavior: autoScroll ? 'smooth' : 'auto',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '12px'
          }}
        >
          {filteredLogs.length === 0 ? (
            <div className="text-green-400 text-center py-8">
              {logs.length === 0 ? 'No logs available' : 'No logs match the current filter'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
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

              return (
                <div key={index} className="mb-0">
                  <div className={`flex items-start ${logColor}`}>
                    <span className="whitespace-nowrap mr-2">
                      {log.timestamp.replace('T', ' ').replace('Z', '').substring(0, 19)}
                    </span>
                    <span className="font-bold uppercase mr-2 whitespace-nowrap">
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="flex-1 break-all">
                      {log.message}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className={`ml-24 ${metadataColor}`}>
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
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
