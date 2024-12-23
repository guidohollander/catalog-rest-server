import { NextResponse } from 'next/server';
import { updateRouteStats, loadStats } from '@/app/utils/statsManager';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

export async function GET() {
    try {
        const stats = await loadStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        return NextResponse.json(
            { error: 'Failed to load stats' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { route, method } = body;

        if (!route || !method) {
            return NextResponse.json(
                { error: 'Missing route or method' },
                { status: 400 }
            );
        }

        await updateRouteStats(route, method);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating stats:', error);
        return NextResponse.json(
            { error: 'Failed to update stats' },
            { status: 500 }
        );
    }
}
