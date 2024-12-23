import fs from 'fs';
import path from 'path';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

// File path for storing route statistics
const STATS_FILE = path.join(process.cwd(), 'route-stats.json');
const BACKUP_FILE = path.join(process.cwd(), 'route-stats.backup.json');

// In-memory cache for stats
let statsCache: RouteStats = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5000; // 5 seconds cache TTL

// Type for route statistics
interface RouteStats {
    [route: string]: {
        [method: string]: {
            count: number;
            lastAccessed: string;
        };
    };
}

// Load stats from file with caching
export async function loadStats(): Promise<RouteStats> {
    const now = Date.now();
    
    // Return cached stats if within TTL
    if (Object.keys(statsCache).length > 0 && (now - lastCacheUpdate) < CACHE_TTL) {
        return statsCache;
    }

    try {
        const data = await fs.promises.readFile(STATS_FILE, 'utf-8');
        statsCache = JSON.parse(data);
        lastCacheUpdate = now;
        return statsCache;
    } catch (error) {
        console.error('Error reading stats file:', error);
        return {};
    }
}

// Get all stats (using cache)
export async function getAllStats(): Promise<RouteStats> {
    return loadStats();
}

// Save stats to file with backup
async function saveStats(stats: RouteStats): Promise<void> {
    try {
        // Create a backup of the current stats
        if (fs.existsSync(STATS_FILE)) {
            await fs.promises.copyFile(STATS_FILE, BACKUP_FILE);
        }

        // Write the new stats
        await fs.promises.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
        
        // Update cache
        statsCache = stats;
        lastCacheUpdate = Date.now();
    } catch (error) {
        console.error('Error writing stats file:', error);
        throw error;
    }
}

// Update route statistics with optimized caching
export async function updateRouteStats(route: string, method: string): Promise<void> {
    try {
        const stats = await loadStats();

        // Initialize route and method if they don't exist
        if (!stats[route]) {
            stats[route] = {};
        }
        if (!stats[route][method]) {
            stats[route][method] = {
                count: 0,
                lastAccessed: new Date().toISOString()
            };
        }

        // Update stats
        stats[route][method].count++;
        stats[route][method].lastAccessed = new Date().toISOString();

        await saveStats(stats);
    } catch (error) {
        console.error('Error updating route stats:', error);
        throw error;
    }
}

// Initialize stats file if it doesn't exist
export async function initStatsFile(): Promise<void> {
    if (!fs.existsSync(STATS_FILE)) {
        await saveStats({});
    }
}
