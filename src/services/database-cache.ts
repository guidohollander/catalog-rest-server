import fs from 'fs/promises';
import path from 'path';
import sql from 'mssql';

interface CachedDatabaseSchema {
  success: boolean;
  schema: string;
  tablesData: any[];
  metadata: {
    tableCount: number;
    version: string;
    generatedAt: string;
    cachedAt: string;
    source: 'live' | 'cache';
  };
}

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
}

export class DatabaseCacheService {
  private static instance: DatabaseCacheService;
  private cacheDir: string;
  private cacheFile: string;
  private maxCacheAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.cacheFile = path.join(this.cacheDir, 'database-schema.json');
  }

  static getInstance(): DatabaseCacheService {
    if (!DatabaseCacheService.instance) {
      DatabaseCacheService.instance = new DatabaseCacheService();
    }
    return DatabaseCacheService.instance;
  }

  /**
   * Get database schema with caching and fallback
   */
  async getDatabaseSchema(): Promise<CachedDatabaseSchema> {
    const config = this.getDatabaseConfig();
    
    try {
      console.log('🔄 Attempting to connect to live database...');
      const liveData = await this.fetchLiveData(config);
      
      // Cache the successful result
      await this.cacheData(liveData);
      console.log('✅ Successfully fetched from live database and cached');
      
      return {
        ...liveData,
        metadata: {
          ...liveData.metadata,
          source: 'live' as const,
          cachedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.warn('⚠️ Live database connection failed:', error instanceof Error ? error.message : 'Unknown error');
      console.log('🔄 Attempting to use cached data...');
      
      try {
        const cachedData = await this.getCachedData();
        console.log('✅ Using cached database schema');
        
        return {
          ...cachedData,
          metadata: {
            ...cachedData.metadata,
            source: 'cache' as const
          }
        };
        
      } catch (cacheError) {
        console.error('❌ Both live database and cache failed');
        throw new Error(`Database unavailable: ${error instanceof Error ? error.message : 'Unknown error'}. Cache error: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`);
      }
    }
  }

  /**
   * Force refresh cache from live database
   */
  async refreshCache(): Promise<CachedDatabaseSchema> {
    const config = this.getDatabaseConfig();
    
    console.log('🔄 Force refreshing cache from live database...');
    const liveData = await this.fetchLiveData(config);
    await this.cacheData(liveData);
    console.log('✅ Cache refreshed successfully');
    
    return {
      ...liveData,
      metadata: {
        ...liveData.metadata,
        source: 'live' as const,
        cachedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get cache status and metadata
   */
  async getCacheStatus(): Promise<{
    exists: boolean;
    age?: number;
    isStale?: boolean;
    lastUpdated?: string;
    size?: number;
  }> {
    try {
      const stats = await fs.stat(this.cacheFile);
      const age = Date.now() - stats.mtime.getTime();
      const isStale = age > this.maxCacheAge;
      
      return {
        exists: true,
        age,
        isStale,
        lastUpdated: stats.mtime.toISOString(),
        size: stats.size
      };
    } catch {
      return { exists: false };
    }
  }

  private getDatabaseConfig(): DatabaseConfig {
    return {
      server: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || '1433'),
      database: process.env.DB_NAME!,
      user: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
  }

  private async fetchLiveData(config: DatabaseConfig): Promise<Omit<CachedDatabaseSchema, 'metadata'> & { metadata: Omit<CachedDatabaseSchema['metadata'], 'source' | 'cachedAt'> }> {
    console.log('Connecting to database:', {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user
    });

    const pool = await sql.connect(config);
    
    try {
      // Get all tables starting with 'mvw_' but excluding certain prefixes
      const tablesResult = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_NAME LIKE 'mvw_%'
        AND TABLE_NAME NOT LIKE 'mvw_svn_%'
        AND TABLE_NAME NOT LIKE 'mvw_jenkins_%'
        ORDER BY TABLE_NAME
      `);

      // Sort tables in specific order
      const priorityTables = [
        'mvw_implementation_component',
        'mvw_solution_implementation', 
        'mvw_component_version',
        'mvw_component'
      ];

      const allTables = tablesResult.recordset.map(row => row.TABLE_NAME);
      const sortedTables = [
        ...priorityTables.filter(table => allTables.includes(table)),
        ...allTables.filter(table => !priorityTables.includes(table))
      ];

      console.log('Found tables:', tablesResult.recordset.map(t => t.TABLE_NAME));

      const tables: any[] = [];
      
      for (const tableName of sortedTables) {
        
        // Get columns for this table
        const columnsResult = await pool.request()
          .input('tableName', sql.NVarChar, tableName)
          .query(`
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              IS_NULLABLE,
              COLUMN_DEFAULT,
              CHARACTER_MAXIMUM_LENGTH,
              NUMERIC_PRECISION,
              NUMERIC_SCALE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        // Get primary key information
        const pkResult = await pool.request()
          .input('tableName', sql.NVarChar, tableName)
          .query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = @tableName
            AND CONSTRAINT_NAME LIKE 'PK_%'
          `);

        const primaryKeys = pkResult.recordset.map(pk => pk.COLUMN_NAME);

        // Get sample data (top 5 rows, most recent first)
        let sampleData: any[] = [];
        try {
          const sampleDataResult = await pool.request()
            .query(`SELECT TOP 5 * FROM [${tableName}] ORDER BY 1 DESC`);
          sampleData = sampleDataResult.recordset;
        } catch (sampleError) {
          console.warn(`Could not fetch sample data for ${tableName}:`, sampleError);
          sampleData = [];
        }

        // Process columns (same logic as original)
        const processedColumns = columnsResult.recordset.map(col => {
          const constraints: string[] = [];
          const isPrimaryKey = primaryKeys.includes(col.COLUMN_NAME) || col.COLUMN_NAME.toLowerCase().startsWith('pk_');
          const isForeignKey = (col.COLUMN_NAME.toLowerCase().endsWith('_id') || col.COLUMN_NAME.toLowerCase().startsWith('fk_')) && !isPrimaryKey;
          const isCaseId = (col.COLUMN_NAME.toLowerCase().includes('cid') || 
                          col.COLUMN_NAME.toLowerCase() === 'caseid' || 
                          col.COLUMN_NAME.toLowerCase() === 'case_id') && !isPrimaryKey && !isForeignKey;
          const isDeleteColumn = col.COLUMN_NAME.toLowerCase().includes('delete') || 
                                col.COLUMN_NAME.toLowerCase() === 'deleted' ||
                                col.COLUMN_NAME.toLowerCase() === 'isdeleted';

          if (isPrimaryKey) constraints.push('pk');
          if (isForeignKey) constraints.push('fk');
          if (isCaseId) constraints.push('cid');
          if (col.IS_NULLABLE === 'NO') constraints.push('not null');
          if (col.COLUMN_DEFAULT) constraints.push(`default: ${col.COLUMN_DEFAULT}`);

          return {
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE + 
                  (col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '') +
                  (col.NUMERIC_PRECISION ? `(${col.NUMERIC_PRECISION}${col.NUMERIC_SCALE ? `,${col.NUMERIC_SCALE}` : ''})` : ''),
            isNullable: col.IS_NULLABLE === 'YES',
            isPrimaryKey,
            isForeignKey,
            isCaseId,
            isDeleteColumn,
            constraints
          };
        });

        // Sort columns: PK first, then FK, then CID, then others, delete columns last
        const columns = processedColumns.sort((a, b) => {
          if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
          if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
          
          if (a.isForeignKey && !b.isForeignKey && !b.isPrimaryKey) return -1;
          if (!a.isForeignKey && b.isForeignKey && !a.isPrimaryKey) return 1;
          
          if (a.isCaseId && !b.isCaseId && !b.isPrimaryKey && !b.isForeignKey) return -1;
          if (!a.isCaseId && b.isCaseId && !a.isPrimaryKey && !a.isForeignKey) return 1;
          
          if (a.isDeleteColumn && !b.isDeleteColumn) return 1;
          if (!a.isDeleteColumn && b.isDeleteColumn) return -1;
          
          return 0;
        });

        tables.push({
          name: tableName,
          columns,
          sampleData,
          note: undefined
        });
      }

      const dbmlSchema = this.generateDBML(tables);

      return {
        success: true,
        schema: dbmlSchema,
        tablesData: tables,
        metadata: {
          tableCount: tables.length,
          version: new Date().toISOString(),
          generatedAt: new Date().toISOString()
        }
      };
      
    } finally {
      await pool.close();
    }
  }

  private async cacheData(data: any): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cacheData = {
        ...data,
        metadata: {
          ...data.metadata,
          cachedAt: new Date().toISOString()
        }
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`📁 Data cached to ${this.cacheFile}`);
    } catch (error) {
      console.warn('⚠️ Failed to cache data:', error);
      // Don't throw - caching failure shouldn't break the response
    }
  }

  private async getCachedData(): Promise<CachedDatabaseSchema> {
    try {
      const cacheContent = await fs.readFile(this.cacheFile, 'utf-8');
      const cachedData = JSON.parse(cacheContent);
      
      // Check if cache is stale
      const cacheAge = Date.now() - new Date(cachedData.metadata.cachedAt).getTime();
      const isStale = cacheAge > this.maxCacheAge;
      
      if (isStale) {
        console.warn(`⚠️ Cache is stale (${Math.round(cacheAge / (60 * 60 * 1000))} hours old), but using anyway`);
      }
      
      return cachedData;
    } catch (error) {
      throw new Error(`Cache read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateDBML(tables: any[]): string {
    let dbml = '';

    tables.forEach(table => {
      dbml += `Table ${table.name} {\n`;
      
      table.columns.forEach((column: any) => {
        let columnDef = `  ${column.name} ${column.type}`;
        
        if (column.constraints && column.constraints.length > 0) {
          columnDef += ` [${column.constraints.join(', ')}]`;
        }
        
        dbml += columnDef + '\n';
      });
      
      if (table.note) {
        dbml += `  \n  Note: '${table.note}'\n`;
      }
      
      dbml += '}\n\n';
    });

    return dbml;
  }
}
