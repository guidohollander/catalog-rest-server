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
    logger.info('SVN Copy Request received', { 
      requestId,
      fromUrl: body.request?.from_url,
      toUrl: body.request?.to_url,
      hasCommitMessage: !!body.request?.commitmessage
    });

    // Validate request body
    if (!body.request || !body.request.from_url || !body.request.to_url || !body.request.commitmessage) {
      logger.warn('Invalid SVN copy request', { 
        requestId,
        missingFields: {
          request: !body.request,
          fromUrl: !body.request?.from_url,
          toUrl: !body.request?.to_url,
          commitMessage: !body.request?.commitmessage
        }
      });
      return NextResponse.json({ 
        response: { 
          success: "0", 
          error: "Missing required parameters" 
        } 
      }, { status: 400 });
    }

    const svnCommand = `svn copy "${body.request.from_url}" "${body.request.to_url}" -m "${body.request.commitmessage}" --username ${svn_username} --password ${svn_password}`;
    
    // Log command with sensitive data masked
    const maskedCommand = svnCommand
      .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
      .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
    logger.info('Executing SVN copy command', { requestId, command: maskedCommand });

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
              error: "SVN copy failed" 
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
        
        logger.info('SVN copy operation completed successfully', { 
          requestId,
          output: maskedStdout,
          fromUrl: body.request.from_url,
          toUrl: body.request.to_url
        });
        
        resolve(NextResponse.json({ 
          response: { 
            success: "1", 
            output: "copy successful" 
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
