import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  logger.info(`Starting SVN copy operation ${requestId}`);
  
  try {
    const body = await request.json();
    
    // Extract copy details for logging
    const fromUrl = body.request?.from_url;
    const toUrl = body.request?.to_url;
    const commitMessage = body.request?.commitmessage;
    
    // Log what is being copied with a more descriptive message
    logger.info(`SVN Copy Request: copying from ${fromUrl} to ${toUrl} with commit message: ${commitMessage}`, { 
      requestId
    });

    // Validate request body
    if (!body.request || !fromUrl || !toUrl || !commitMessage) {
      const missingParams = [];
      if (!body.request) missingParams.push('request');
      if (!fromUrl) missingParams.push('from_url');
      if (!toUrl) missingParams.push('to_url');
      if (!commitMessage) missingParams.push('commitmessage');
      
      logger.warn(`Invalid SVN copy request - missing required parameters: ${missingParams.join(', ')}`, { 
        requestId
      });
      return NextResponse.json({ 
        response: { 
          success: "0", 
          error: "Missing required parameters" 
        } 
      }, { status: 400 });
    }

    const svnCommand = `svn copy "${fromUrl}" "${toUrl}" -m "${commitMessage}" --username ${svn_username} --password ${svn_password}`;
    
    // Log command details without sensitive data
    logger.info(`Executing SVN copy from ${fromUrl} to ${toUrl}`, { 
      requestId,
      command: `svn copy "${fromUrl}" "${toUrl}" -m "${commitMessage}" --username ***REDACTED*** --password ***REDACTED***`
    });

    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnCommand, (error, stdout, stderr) => {
        if (error) {
          const maskedError = error.message
            .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
            .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
          
          logger.error('SVN copy operation failed', { 
            requestId,
            error: maskedError,
            code: error.code,
            signal: error.signal
          });
          
          resolve(NextResponse.json({ 
            response: { 
              success: "0", 
              error: `SVN copy failed: ${maskedError}` 
            } 
          }, { status: 500 }));
          return;
        }
        
        if (stderr) {
          const maskedStderr = stderr
            .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
            .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
          
          logger.warn('SVN copy warning', { 
            requestId,
            stderr: maskedStderr
          });
        }
        
        const maskedStdout = stdout
          .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
          .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
        
        // Parse what was copied from the stdout
        let copiedItems: string[] = [];
        let externalsInfo: string[] = [];
        
        if (maskedStdout) {
          // Extract file/directory names from SVN output
          const lines = maskedStdout.split('\n');
          copiedItems = lines.filter(line => line.includes('A') && line.includes(fromUrl));
          
          // Look for externals-related information
          externalsInfo = lines.filter(line => 
            line.toLowerCase().includes('external') || 
            line.includes('svn:externals') ||
            line.includes('Fetching external') ||
            line.includes('Updated external')
          );
        }
        
        // Enhanced logging for externals changes
        if (externalsInfo.length > 0) {
          logger.info(`SVN copy operation completed with externals changes. Source: ${fromUrl} -> Target: ${toUrl}`, { 
            requestId,
            externalsChanges: externalsInfo,
            totalCopiedItems: copiedItems.length,
            commitMessage: commitMessage
          });
          
          // Log each external change separately for better visibility
          externalsInfo.forEach((external, index) => {
            logger.info(`External change ${index + 1}: ${external}`, { requestId });
          });
        } else {
          logger.info(`SVN copy operation completed successfully. Copied ${copiedItems.length} items from ${fromUrl} to ${toUrl}`, { 
            requestId,
            output: maskedStdout
          });
        }
        
        resolve(NextResponse.json({ 
          response: { 
            success: "1", 
            output: "copy successful",
            copiedItems: copiedItems.length > 0 ? copiedItems : undefined
          } 
        }));
      });
    });
  } catch (error) {
    logger.error('Error in SVN copy route', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      response: { 
        success: "0", 
        error: "Internal server error" 
      } 
    }, { status: 500 });
  }
}
