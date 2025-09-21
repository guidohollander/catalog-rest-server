import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/src/config/loader';
import https from 'https';
import { URL } from 'url';

// Load configuration
const config = loadConfig();

interface ExternalLogEntry {
  line: string;
  lineNumber: number;
}

export async function GET(request: NextRequest) {
  console.log('External logs API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Build the URL for today's log file
    const baseUri = config.services.externalLogs?.baseUri || 'https://belog.proxy01.dcsc.com:8443/DCSCSRV26-TC1/SERVICECATALOG-D/MAIN/application_log';
    const logUrl = `${baseUri}/server.log.${date}.0.log`;
    
    console.log(`Downloading external log from: ${logUrl}`);
    
    // Get credentials from config
    const username = config.services.externalLogs?.username;
    const password = config.services.externalLogs?.password;
    
    if (!username || !password) {
      return NextResponse.json({
        error: 'External logs credentials not configured',
        logs: [],
        metadata: {
          url: logUrl,
          date,
          lineCount: 0,
          downloadedAt: new Date().toISOString()
        }
      }, { status: 500 });
    }
    
    // Create Basic Auth header
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Download the log file using native HTTPS module
    const logContent = await new Promise<string>((resolve, reject) => {
      const parsedUrl = new URL(logUrl);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'ServiceCatalog-LogViewer/1.0'
        },
        rejectUnauthorized: false // This bypasses SSL certificate validation
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
    const lines = logContent.split('\n').filter(line => line.trim() !== '');
    
    // Convert to log entries with line numbers
    const logs: ExternalLogEntry[] = lines.map((line, index) => ({
      line: line.trim(),
      lineNumber: index + 1
    }));
    
    console.log(`Downloaded ${logs.length} log lines from external source`);
    
    return NextResponse.json({
      logs,
      metadata: {
        url: logUrl,
        date,
        lineCount: logs.length,
        downloadedAt: new Date().toISOString(),
        timezoneOffset: config.services.externalLogs?.timezoneOffset
      }
    });
    
  } catch (error) {
    console.error('External logs download error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      logs: [],
      metadata: {
        url: 'unknown',
        date: new Date().toISOString().split('T')[0],
        lineCount: 0,
        downloadedAt: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
