import { NextResponse } from 'next/server';
import { getAllStats } from '../../utils/statsManager';

export async function GET() {
    const stats = await getAllStats();
    return NextResponse.json(stats);
}
