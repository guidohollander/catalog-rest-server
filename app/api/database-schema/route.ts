import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

interface TableSchema {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isCaseId: boolean;
    constraints: string[];
  }>;
  sampleData: any[];
  note?: string;
}

export async function GET(request: NextRequest) {
  return await getDatabaseSchema();
}

async function getDatabaseSchema(): Promise<NextResponse> {
  const config = {
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

    const tables: TableSchema[] = [];
    
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

      // Process columns
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

    const dbmlSchema = generateDBML(tables);

    return NextResponse.json({
      success: true,
      schema: dbmlSchema,
      tablesData: tables,
      metadata: {
        tableCount: tables.length,
        version: new Date().toISOString(),
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Database schema error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      schema: '',
      tablesData: [],
      metadata: {
        tableCount: 0,
        version: new Date().toISOString(),
        generatedAt: new Date().toISOString()
      }
    }, { status: 500 });
  } finally {
    await pool.close();
  }
}

function generateDBML(tables: TableSchema[]): string {
  let dbml = '';

  tables.forEach(table => {
    dbml += `Table ${table.name} {\n`;
    
    table.columns.forEach(column => {
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
