'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RouteStats {
    count: number;
    lastAccessed: string;
}

interface StatsData {
    [key: string]: {
        [method: string]: RouteStats;
    };
}

export default function StatsPage() {
    const [stats, setStats] = useState<StatsData>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/stats/authenticated');
                if (!response.ok) {
                    throw new Error('Failed to fetch statistics');
                }
                const data = await response.json();
                setStats(data);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to load statistics');
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">API Route Statistics</h1>
                <Link href="/" className="text-blue-500 hover:text-blue-700 underline">
                    Back to Home
                </Link>
            </div>

            {loading && (
                <div className="text-center py-8">
                    <div className="animate-pulse">Loading statistics...</div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-4">
                    {Object.entries(stats).map(([route, methods]) => (
                        <div key={route} className="border rounded-lg p-4 bg-white shadow-sm">
                            <h2 className="text-xl font-semibold mb-2 text-gray-800">{route}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(methods).map(([method, data]) => (
                                    <div key={method} className="bg-gray-50 p-3 rounded-md">
                                        <div className="font-medium text-gray-700">{method}</div>
                                        <div className="text-sm space-y-1">
                                            <div className="text-gray-600">Calls: {data.count}</div>
                                            <div className="text-gray-500 text-xs">
                                                Last accessed: {new Date(data.lastAccessed).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(stats).length === 0 && (
                        <div className="text-gray-500 text-center py-8">
                            No authenticated route statistics available yet
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
