'use client';

import { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isCaseId: boolean;
  constraints: string[];
}

interface Table {
  name: string;
  columns: Column[];
  sampleData: any[];
  note?: string;
}

interface SchemaMetadata {
  tableCount: number;
  version: string;
  description?: string;
  source?: 'live' | 'cache' | 'error';
  generatedAt?: string;
  cachedAt?: string;
  cacheStatus?: {
    exists: boolean;
    age?: number;
    isStale?: boolean;
    lastUpdated?: string;
    size?: number;
  };
}

export default function DatabaseDiagram() {
  const [dbmlSchema, setDbmlSchema] = useState<string>('');
  const [tablesData, setTablesData] = useState<Table[]>([]);
  const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata>({
    tableCount: 0,
    version: '1.0.0',
    description: 'Database schema visualization'
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const parseTables = (schema: string): Table[] => {
    // Simple parser for DBML schema - in real implementation this would be more robust
    const tables: Table[] = [];
    const tableMatches = schema.match(/Table\s+(\w+)\s*\{([^}]+)\}/g);
    
    if (tableMatches) {
      tableMatches.forEach(tableMatch => {
        const nameMatch = tableMatch.match(/Table\s+(\w+)/);
        if (nameMatch) {
          const tableName = nameMatch[1];
          const columns: Column[] = [];
          
          // Extract columns - this is a simplified parser
          const columnLines = tableMatch.split('\n').slice(1, -1);
          columnLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('Note:')) {
              const parts = trimmed.split(/\s+/);
              if (parts.length >= 2) {
                columns.push({
                  name: parts[0],
                  type: parts[1],
                  isPrimaryKey: trimmed.includes('pk'),
                  isForeignKey: trimmed.includes('fk'),
                  isCaseId: trimmed.includes('cid'),
                  constraints: []
                });
              }
            }
          });
          
          tables.push({
            name: tableName,
            columns,
            sampleData: [],
            note: undefined
          });
        }
      });
    }
    
    return tables;
  };

  const fetchSchema = async () => {
    try {
      setError(null);
      const response = await fetch('/api/database-schema');
      const data = await response.json();
      
      if (data.success && data.schema && data.schema.trim().length > 0) {
        // Only update if we actually got schema data
        const parsedTables = parseTables(data.schema);
        if (parsedTables.length > 0) {
          setDbmlSchema(data.schema);
          setTablesData(data.tablesData || []);
          setSchemaMetadata({
            tableCount: data.metadata.tableCount,
            version: data.metadata.version,
            description: data.metadata.description,
            source: data.metadata.source,
            generatedAt: data.metadata.generatedAt,
            cachedAt: data.metadata.cachedAt,
            cacheStatus: data.metadata.cacheStatus
          });
          setLastUpdated(new Date(data.metadata.generatedAt));
        } else {
          // No tables found in response, keep default schema
          setError('No tables found in database - showing default schema');
        }
      } else {
        throw new Error(data.message || 'Failed to fetch schema');
      }
    } catch (err) {
      console.error('Error fetching schema:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep existing default schema, don't override it
    }
  };

  const refreshDiagram = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = forceRefresh ? '/api/database-schema?refresh=true' : '/api/database-schema';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.schema && data.schema.trim().length > 0) {
        const parsedTables = parseTables(data.schema);
        if (parsedTables.length > 0) {
          setDbmlSchema(data.schema);
          setTablesData(data.tablesData || []);
          setSchemaMetadata({
            tableCount: data.metadata.tableCount,
            version: data.metadata.version,
            description: data.metadata.description,
            source: data.metadata.source,
            generatedAt: data.metadata.generatedAt,
            cachedAt: data.metadata.cachedAt,
            cacheStatus: data.metadata.cacheStatus
          });
          setLastUpdated(new Date(data.metadata.generatedAt));
        } else {
          setError('No tables found in database - showing default schema');
        }
      } else {
        throw new Error(data.message || 'Failed to fetch schema');
      }
    } catch (err) {
      console.error('Error fetching schema:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    
    setIsLoading(false);
  };

  const refreshFromLive = async () => {
    await refreshDiagram(true);
  };

  const openInDbDiagram = async () => {
    try {
      // Advanced compression with pattern analysis
      let compressedSchema = dbmlSchema
        // Remove all comments first
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Aggressive whitespace normalization
        .replace(/\s+/g, ' ')
        .replace(/\n\s*/g, '\n')
        // Remove ALL spaces around symbols
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*\[\s*/g, '[')
        .replace(/\s*\]\s*/g, ']')
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        // Advanced DBML-specific compression
        .replace(/\bTable\s+/g, 'T ')
        .replace(/\bRef:\s*/g, 'R:')
        // Compress data types more aggressively
        .replace(/\bnvarchar\b/gi, 'nv')
        .replace(/\bvarchar\b/gi, 'v')
        .replace(/\binteger\b/gi, 'i')
        .replace(/\bbigint\b/gi, 'bi')
        .replace(/\bsmallint\b/gi, 'si')
        .replace(/\btinyint\b/gi, 'ti')
        .replace(/\bdatetime2?\b/gi, 'd')
        .replace(/\btimestamp\b/gi, 't')
        .replace(/\bboolean\b/gi, 'b')
        .replace(/\bdecimal\b/gi, 'dec')
        .replace(/\bfloat\b/gi, 'f')
        .replace(/\bmoney\b/gi, 'm')
        .replace(/\btext\b/gi, 'txt')
        .replace(/\bchar\b/gi, 'c')
        .replace(/\bbit\b/gi, 'bt')
        // Compress constraints
        .replace(/\bnot null\b/gi, 'nn')
        .replace(/\bprimary key\b/gi, 'pk')
        .replace(/\bforeign key\b/gi, 'fk')
        .replace(/\bdefault\b/gi, 'def')
        .replace(/\bunique\b/gi, 'unq')
        // Remove newlines completely for maximum compression
        .replace(/\n/g, '')
        // Final cleanup
        .trim();

      // If still too large, try even more aggressive compression
      if (compressedSchema.length > 5000) {
        console.log('Applying extreme compression...');
        compressedSchema = compressedSchema
          // Remove table/column names that are repetitive
          .replace(/mvw_/g, 'm_')
          .replace(/_component/g, '_c')
          .replace(/_implementation/g, '_i')
          .replace(/_solution/g, '_s')
          .replace(/_version/g, '_v')
          // Compress common column patterns
          .replace(/\b(\w+)_id\b/g, '$1i')
          .replace(/\bcreated_/g, 'cr_')
          .replace(/\bupdated_/g, 'up_')
          .replace(/\bmodified_/g, 'md_')
          .replace(/\bdeleted_/g, 'dl_')
          .replace(/\btimestamp/g, 'ts')
          .replace(/\bexternal/g, 'ext');
      }

      console.log(`Original: ${dbmlSchema.length} chars, Compressed: ${compressedSchema.length} chars (${Math.round((1 - compressedSchema.length / dbmlSchema.length) * 100)}% reduction)`);

      // Try different URL approaches with dbdiagram.io
      const approaches = [
        // Approach 1: Direct schema parameter (most common)
        () => `https://dbdiagram.io/d?schema=${encodeURIComponent(compressedSchema)}`,
        
        // Approach 2: Using 'code' parameter
        () => `https://dbdiagram.io/d?code=${encodeURIComponent(compressedSchema)}`,
        
        // Approach 3: Base64 encoded
        () => {
          const base64 = btoa(compressedSchema);
          return `https://dbdiagram.io/d?data=${base64}`;
        },
        
        // Approach 4: URL-safe base64
        () => {
          const base64 = btoa(compressedSchema)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          return `https://dbdiagram.io/d?schema=${base64}`;
        }
      ];

      // Try each approach in order
      for (let i = 0; i < approaches.length; i++) {
        try {
          const url = approaches[i]();
          console.log(`Approach ${i + 1}: ${url.length} chars`);
          
          // Be more aggressive with size limit - try up to 7KB
          if (url.length < 7000) {
            console.log(`✅ Using approach ${i + 1}: Direct URL`);
            window.open(url, '_blank');
            return;
          }
        } catch (approachError) {
          console.warn(`Approach ${i + 1} failed:`, approachError);
        }
      }
      
      // If all URL approaches fail, use download fallback
      console.log('All URL approaches too large, using download fallback');
      fallbackToDownload();
      
    } catch (error) {
      console.error('All methods failed, using download fallback:', error);
      fallbackToDownload();
    }
  };


  const fallbackToDownload = () => {
    // Create a temporary file download for the user to import
    const blob = new Blob([dbmlSchema], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database-schema.dbml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Open dbdiagram.io in a new tab
    setTimeout(() => {
      window.open('https://dbdiagram.io/d', '_blank');
    }, 500);
    
    // Show instructions notification
    setShowInstructions(true);
    setTimeout(() => setShowInstructions(false), 8000);
  };

  useEffect(() => {
    // Initial load
    refreshDiagram();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshDiagram();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const getDataTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('bigint') || lowerType.includes('smallint')) {
      return 'text-blue-300';
    }
    if (lowerType.includes('varchar') || lowerType.includes('char') || lowerType.includes('text')) {
      return 'text-green-300';
    }
    if (lowerType.includes('datetime') || lowerType.includes('date') || lowerType.includes('time')) {
      return 'text-purple-300';
    }
    if (lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('money')) {
      return 'text-yellow-300';
    }
    if (lowerType.includes('bit') || lowerType.includes('boolean')) {
      return 'text-red-300';
    }
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="py-8">
        {/* Header */}
        <div className="mb-8 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center">
                <span className="text-4xl mr-3">🗄️</span>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Database
                </h1>
              </div>
              <p className="text-sm text-gray-400">
                Always up-to-date database schema visualization
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Auto-refresh:</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => refreshDiagram(false)}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FiRefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => refreshDiagram(true)}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-orange-600 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-300 bg-orange-700 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <FiRefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Force Refresh
            </button>
            
            <button
              onClick={openInDbDiagram}
              disabled={!dbmlSchema || dbmlSchema.trim().length === 0}
              title="Download DBML file and open dbdiagram.io for interactive visualization"
              className="inline-flex items-center px-3 py-2 border border-blue-600 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-300 bg-blue-700 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Visualize in dbdiagram.io
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-6 px-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                <span className="text-gray-300">Last updated: {lastUpdated?.toLocaleString() || 'Loading...'}</span>
                {autoRefresh && (
                  <span className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Auto-refresh enabled
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-gray-400">
                <span>Tables: {schemaMetadata.tableCount}</span>
                <span>Version: {schemaMetadata.version}</span>
                <span>
                  Source: 
                  <span className={`ml-1 ${
                    schemaMetadata.source === 'live' ? 'text-green-400' : 
                    schemaMetadata.source === 'cache' ? 'text-yellow-400' : 
                    'text-red-400'
                  }`}>
                    {schemaMetadata.source === 'live' ? '🟢 Live Database' : 
                     schemaMetadata.source === 'cache' ? '🟡 Cached Data' : 
                     '🔴 Error'}
                  </span>
                </span>
                {schemaMetadata.cacheStatus?.exists && (
                  <span>
                    Cache: 
                    <span className={`ml-1 ${schemaMetadata.cacheStatus.isStale ? 'text-orange-400' : 'text-green-400'}`}>
                      {schemaMetadata.cacheStatus.isStale ? 'Stale' : 'Fresh'} 
                      ({Math.round((schemaMetadata.cacheStatus.age || 0) / (60 * 1000))}m old)
                    </span>
                  </span>
                )}
                <span>Status: {isLoading ? 'Updating...' : error ? 'Error (using fallback)' : 'Up to date'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Notification */}
        {showInstructions && (
          <div className="mb-6 px-6">
            <div className="bg-blue-800 border border-blue-600 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-200">
                    DBML file downloaded!
                  </h3>
                  <div className="mt-2 text-sm text-blue-300">
                    <p>In the new dbdiagram.io tab:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Click &quot;Import&quot; or drag &amp; drop the downloaded file</li>
                      <li>Your database schema will be visualized interactively</li>
                    </ol>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => setShowInstructions(false)}
                    className="bg-blue-700 rounded-md p-1.5 text-blue-300 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Error Alert */}
          {error && (
            <div className="bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-200">
                    <strong>Warning:</strong> {error}. Using fallback schema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Embedded dbdiagram.io */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
                <div className="flex items-center space-x-2">
                  <FiRefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                  <span className="text-gray-300">Updating diagram...</span>
                </div>
              </div>
            )}
            
            <div className="space-y-6 p-6" id="top">
              {/* Navigation Anchors */}
              {tablesData.length > 0 && (
                <div className="mb-8 p-4 bg-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {tablesData.map((table: any) => (
                      <a
                        key={table.name}
                        href={`#${table.name}`}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors whitespace-nowrap"
                      >
                        {table.name.replace('mvw_', '')}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Schema Tables Grid */}
              {dbmlSchema ? (
                <>
                  <div className="space-y-6">
                    {tablesData.map((table: any, index: number) => (
                      <div key={index} id={table.name} className="bg-gray-700 border border-gray-600 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-blue-600 text-white px-6 py-4">
                          <h3 className="font-semibold text-xl">{table.name}</h3>
                          {table.note && (
                            <p className="text-blue-100 text-sm mt-1">{table.note}</p>
                          )}
                        </div>
                        
                        {/* Schema Section */}
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-600">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-200 w-1/6">Column</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-200 w-1/6">Type</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-200 w-4/6">Example</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-600">
                                {table.columns.map((column: any, colIndex: number) => {
                                  let rowBgColor = 'bg-gray-700';
                                  if (column.isPrimaryKey) rowBgColor = 'bg-yellow-600';
                                  else if (column.isForeignKey) rowBgColor = 'bg-green-600';
                                  else if (column.isCaseId) rowBgColor = 'bg-purple-600';
                                  
                                  return (
                                    <tr key={colIndex} className={rowBgColor}>
                                      <td className="px-3 py-2 font-mono text-gray-100">
                                        <div className="flex items-center">
                                          {column.isPrimaryKey && <span className="text-yellow-200 mr-2" title="Primary Key">🔑</span>}
                                          {column.isForeignKey && !column.isPrimaryKey && <span className="text-green-200 mr-2" title="Foreign Key">🔗</span>}
                                          {column.isCaseId && <span className="text-purple-200 mr-2" title="Case Identifier">🆔</span>}
                                          {column.name}
                                        </div>
                                      </td>
                                      <td className={`px-3 py-2 font-mono font-semibold ${getDataTypeColor(column.type)}`}>
                                        {column.type}
                                      </td>
                                      <td className="px-3 py-2 text-gray-300 font-mono text-xs">
                                        {(() => {
                                          const tableData = tablesData.find(t => t.name === table.name);
                                          const sampleData = tableData?.sampleData || [];
                                          if (sampleData.length === 0) return '-';
                                          
                                          const latestRow = sampleData[0]; // First row is most recent
                                          const value = latestRow[column.name];
                                          
                                          if (value === null || value === undefined) return 'NULL';
                                          if (typeof value === 'object' && value instanceof Date) {
                                            return value.toISOString().split('T')[0];
                                          }
                                          return String(value);
                                        })()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Back to Top Button */}
                        <div className="flex justify-end mb-4">
                          <a
                            href="#top"
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                          >
                            ↑ Back to Top
                          </a>
                        </div>

                        {/* Sample Data Section */}
                        <div className="px-4 pb-4">
                          <div className="bg-gray-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-56 overflow-y-auto pb-6">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-600 sticky top-0">
                                  <tr>
                                    {table.columns
                                      .filter((column: any) => !column.isPrimaryKey && !column.isForeignKey && !column.isCaseId)
                                      .map((column: any, colIndex: number) => (
                                      <th key={colIndex} className="px-3 py-1 text-left font-medium text-gray-200 whitespace-nowrap">
                                        {column.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-600">
                                  {(() => {
                                    const tableData = tablesData.find(t => t.name === table.name);
                                    const sampleData = tableData?.sampleData || [];
                                    
                                    if (sampleData.length === 0) {
                                      return (
                                        <tr className="bg-gray-800">
                                          <td colSpan={table.columns.filter((col: any) => !col.isPrimaryKey && !col.isForeignKey && !col.isCaseId).length} className="px-4 py-2 text-gray-400 text-center italic">
                                            No sample data available
                                          </td>
                                        </tr>
                                      );
                                    }
                                    
                                    return sampleData.slice(0, 5).map((row: any, rowIndex: number) => (
                                      <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-800" : "bg-gray-750"}>
                                        {table.columns
                                          .filter((column: any) => !column.isPrimaryKey && !column.isForeignKey && !column.isCaseId)
                                          .map((column: any, colIndex: number) => {
                                          const value = row[column.name];
                                          let displayValue = value;
                                          
                                          if (value === null || value === undefined) {
                                            displayValue = 'NULL';
                                          } else if (typeof value === 'object' && value instanceof Date) {
                                            displayValue = value.toISOString().split('T')[0];
                                          } else if (column.name.toLowerCase() === 'externals' && typeof value === 'string' && value.length > 50) {
                                            displayValue = value.substring(0, 47) + '...';
                                          } else {
                                            displayValue = String(value);
                                          }
                                          
                                          return (
                                            <td key={colIndex} className="px-3 py-1 text-gray-300 font-mono text-xs break-words" title={String(value)}>
                                              {displayValue}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ));
                                  })()
                                  }
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🗄️</div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">No Database Schema</h3>
                  <p className="text-gray-500 mb-4">Click refresh to load the database schema</p>
                  <button
                    onClick={() => refreshDiagram()}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <FiRefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Load Schema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
