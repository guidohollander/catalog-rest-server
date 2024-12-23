import { NextResponse } from 'next/server';
import { loadStats } from '@/app/utils/statsManager';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

// Routes that should be excluded from stats tracking
const EXCLUDED_ROUTES = [
    '/api/health',
    '/api/svn/health',
    '/api/jenkins/ping',
    '/api/stats',
    '/api/stats/data',
    '/api/stats/authenticated',
    '/stats'
];

export async function GET() {
    try {
        const stats = await loadStats();

        // Filter out excluded routes and return only authenticated routes
        const authenticatedStats: Record<string, Record<string, { count: number; lastAccessed: string }>> = 
            Object.entries(stats).reduce((acc: Record<string, any>, [route, methods]) => {
                // Only include routes that are not in the excluded list
                if (
                    route.startsWith('/api/') && 
                    !EXCLUDED_ROUTES.includes(route)
                ) {
                    acc[route] = methods;
                }
                return acc;
            }, {});

        return NextResponse.json(authenticatedStats);
    } catch (error) {
        console.error('Error loading stats:', error);
        return NextResponse.json(
            { error: 'Failed to load stats' },
            { status: 500 }
        );
    }
}
