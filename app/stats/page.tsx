'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiHome, FiRefreshCw, FiTrash2 } from 'react-icons/fi';

interface MethodStat {
  method: string;
  count: number;
  lastAccessed: string;
}

interface EndpointStat {
  route: string;
  totalRequests: number;
  methods: MethodStat[];
}

interface StatsData {
  summary: {
    totalRequests: number;
    totalEndpoints: number;
    generatedAt: string;
  };
  endpoints: EndpointStat[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetStats = async () => {
    setIsResetting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset statistics');
      }
      
      // Refresh stats after reset
      await fetchStats();
      setShowResetConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-400';
      case 'POST': return 'text-blue-400';
      case 'PUT': return 'text-yellow-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="py-8">
        {/* Header */}
        <div className="mb-8 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center">
                <span className="text-4xl mr-3">📊</span>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  API Statistics
                </h1>
              </div>
              <p className="text-sm text-gray-400">
                Usage statistics for authenticated API routes and protected pages
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchStats}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                title="Refresh Statistics"
              >
                <FiRefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={isLoading || isResetting}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                title="Reset All Statistics"
              >
                <FiTrash2 className="mr-2" />
                Reset
              </button>
              <Link 
                href="/" 
                className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                title="Back to Home"
              >
                <FiHome className="mr-2" />
                Home
              </Link>
            </div>
          </div>
        </div>

        <div className="px-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-400">Loading statistics...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300">Error: {error}</p>
            </div>
          )}

          {stats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Total Requests</h3>
                  <p className="text-3xl font-bold text-blue-400">{stats.summary.totalRequests.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Total Endpoints</h3>
                  <p className="text-3xl font-bold text-green-400">{stats.summary.totalEndpoints}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Last Updated</h3>
                  <p className="text-sm text-gray-400">{formatDate(stats.summary.generatedAt)}</p>
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-semibold">Endpoint Usage</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Methods
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total Requests
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last Accessed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {stats.endpoints.map((endpoint, index) => (
                        <tr key={endpoint.route} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-sm font-mono text-blue-300">{endpoint.route}</code>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {endpoint.methods.map((method) => (
                                <span
                                  key={method.method}
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getMethodColor(method.method)} bg-gray-700`}
                                >
                                  {method.method} ({method.count})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-semibold text-white">
                              {endpoint.totalRequests.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(endpoint.methods.reduce((latest, method) => 
                              new Date(method.lastAccessed) > new Date(latest) ? method.lastAccessed : latest,
                              endpoint.methods[0].lastAccessed
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Reset Statistics</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to reset all statistics? This action cannot be undone and will permanently delete all usage data.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={resetStats}
                  disabled={isResetting}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                >
                  {isResetting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" />
                      Reset All
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
