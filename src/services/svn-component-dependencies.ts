import { execSync } from 'child_process';
import sql from 'mssql';
import { loadConfig, loadEnvironmentOverrides } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';
import {
  buildPropgetCommand,
  normalizeExternalsForCatalog,
  parseComponentVersionIdentity,
} from '@/src/services/svn-component-dependencies.helpers';

const baseConfig = loadConfig();
const config = loadEnvironmentOverrides(baseConfig);

const svnUsername = config.services.svn.username;
const svnPassword = config.services.svn.password;

interface DatabaseConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
}

export interface RefreshedComponentDependencyRow {
  component_name_from: string;
  component_version_from: string;
  component_name_to: string;
  component_version_to: string;
  component_project_name_to: string;
}

export interface RefreshComponentDependenciesResult {
  fromUrl: string;
  componentNameFrom: string;
  componentVersionFrom: string;
  dependencyCount: number;
  rows: RefreshedComponentDependencyRow[];
}

function getDatabaseConfig(): DatabaseConfig {
  return {
    server: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || '',
    user: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 5000,
    requestTimeout: 20000,
  };
}

function maskSensitive(value: string): string {
  return value
    .replace(new RegExp(svnPassword, 'g'), '***REDACTED***')
    .replace(new RegExp(svnUsername, 'g'), '***REDACTED***');
}

export function fetchSvnExternals(fromUrl: string): string {
  const command = buildPropgetCommand(fromUrl, svnUsername, svnPassword);
  try {
    logger.info(`Refreshing component dependencies: reading svn:externals for ${fromUrl}`, {
      command: maskSensitive(command),
    });
    return execSync(command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String((error as any).stderr || '') : '';
    const stdout = error instanceof Error && 'stdout' in error ? String((error as any).stdout || '') : '';
    const combined = `${stdout}\n${stderr}`.trim();
    const masked = maskSensitive(combined);
    if (
      masked.includes('W200017') ||
      masked.toLowerCase().includes('has no property') ||
      masked.toLowerCase().includes('property') && masked.toLowerCase().includes('not found')
    ) {
      logger.info(`No svn:externals found for ${fromUrl}; refreshing with an empty dependency set.`);
      return '';
    }

    logger.error(`Failed to read svn:externals for ${fromUrl}`, {
      error: masked || (error instanceof Error ? maskSensitive(error.message) : 'Unknown error'),
    });
    throw error;
  }
}

async function fetchPersistedRows(
  pool: sql.ConnectionPool,
  componentNameFrom: string,
  componentVersionFrom: string,
): Promise<RefreshedComponentDependencyRow[]> {
  const result = await pool
    .request()
    .input('componentNameFrom', sql.NVarChar, componentNameFrom)
    .input('componentVersionFrom', sql.NVarChar, componentVersionFrom)
    .query(`
      SELECT
        component_name_from,
        component_version_from,
        component_name_to,
        component_version_to,
        component_project_name_to
      FROM mvw_component_version_dependency
      WHERE deleted = 0
        AND component_name_from = @componentNameFrom
        AND component_version_from = @componentVersionFrom
      ORDER BY component_name_to, component_version_to, component_project_name_to
    `);

  return result.recordset as RefreshedComponentDependencyRow[];
}

export async function refreshComponentDependencies(fromUrl: string): Promise<RefreshComponentDependenciesResult> {
  const trimmedUrl = fromUrl.trim();
  const { componentNameFrom, componentVersionFrom } = parseComponentVersionIdentity(trimmedUrl);
  const externals = normalizeExternalsForCatalog(fetchSvnExternals(trimmedUrl));
  const dbConfig = getDatabaseConfig();
  const pool = await sql.connect(dbConfig);

  try {
    await pool
      .request()
      .input('Revision', sql.BigInt, 0)
      .input('Externals', sql.NVarChar(sql.MAX), externals)
      .input('FullUrl', sql.NVarChar, trimmedUrl)
      .execute('ProcessComponentExternals');

    const rows = await fetchPersistedRows(pool, componentNameFrom, componentVersionFrom);

    logger.info(`Component dependencies refreshed for ${trimmedUrl}`, {
      componentNameFrom,
      componentVersionFrom,
      dependencyCount: rows.length,
    });

    return {
      fromUrl: trimmedUrl,
      componentNameFrom,
      componentVersionFrom,
      dependencyCount: rows.length,
      rows,
    };
  } finally {
    await pool.close();
  }
}
