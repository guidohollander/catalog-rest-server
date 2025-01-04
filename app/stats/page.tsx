'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { logger } from '@/src/utils/logger';

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
                logger.error('Error fetching stats:', error);
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
        <main className="flex min-h-screen flex-col items-center p-4 md:p-24 bg-[#1a1b26] text-white">
            <div className="w-full max-w-4xl space-y-8">
                <Link href="/" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-8">API Route Statistics</h1>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-6">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <p className="text-gray-300">Loading statistics...</p>
                    </div>
                ) : (
                    <section className="bg-gray-800 p-6 rounded-lg space-y-6">
                        {Object.entries(stats).map(([route, methods]) => (
                            <div key={route} className="border-b border-gray-700 last:border-0 pb-4 last:pb-0">
                                <h3 className="text-xl font-semibold text-blue-400 mb-2">{route}</h3>
                                <div className="space-y-2">
                                    {Object.entries(methods).map(([method, stats]) => (
                                        <div key={`${route}-${method}`} className="flex justify-between items-center text-gray-300">
                                            <div className="flex items-center">
                                                <span className="w-16 text-gray-400">{method}</span>
                                                <span className="ml-4">Calls: {stats.count}</span>
                                            </div>
                                            <span className="text-sm">
                                                Last accessed: {new Date(stats.lastAccessed).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}
