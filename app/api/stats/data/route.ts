import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

const STATS_FILE = path.join(process.cwd(), 'route-stats.json');

// Initialize stats file if it doesn't exist
async function initStatsFile() {
    try {
        await fs.access(STATS_FILE);
    } catch {
        await fs.writeFile(STATS_FILE, JSON.stringify({}, null, 2));
    }
}

export async function GET() {
    try {
        await initStatsFile();
        const data = await fs.readFile(STATS_FILE, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading stats:', error);
        return NextResponse.json({});
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        await fs.writeFile(STATS_FILE, JSON.stringify(data, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error writing stats:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
