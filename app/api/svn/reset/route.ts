import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const { from_url } = requestBody.request;

    logger.info(`SVN Reset Request received for URL: ${from_url || 'undefined'}`);

    if (!from_url) {
      logger.warn('SVN Reset request missing required SVN URL parameter');
      return NextResponse.json(
        { error: 'SVN URL is required' }, 
        { status: 400 }
      );
    }

    return new Promise((resolve, reject) => {
      // Generate a temporary file name to use for SVN modification
      const fMod = `ext_mod_${crypto.randomBytes(8).toString("hex")}`;
      const fullPath = path.join(os.tmpdir(), fMod);
      fs.writeFileSync(fullPath, "");

      // Construct the SVN command to add a .no-op file to the target URL
      const svnCommand = `svnmucc put ${fullPath} -m "reset" ${from_url}.no-op --username ${svn_username} --password ${svn_password}`;
      
      // Log command with sensitive data masked
      logger.info(`Executing SVN reset command for URL: ${from_url}.no-op`, { 
        command: `svnmucc put ${fullPath} -m "reset" ${from_url}.no-op --username ***REDACTED*** --password ***REDACTED***`
      });

      // Execute the SVN command asynchronously
      exec(svnCommand, (error, stdout, stderr) => {
        // Clean up the temporary file after command execution
        fs.unlinkSync(fullPath);

        // Send immediate response to the client
        resolve(
          NextResponse.json({
            response: {
              success: "1",
              output: "Reset initiated",
            },
          })
        );

        // Handle any errors from executing the SVN command
        if (error) {
          // Check if the error is related to the pre-commit hook rejection
          if (
            stderr &&
            stderr.includes(
              "Commit rejected: adding or modifying a .no-op file is not allowed."
            )
          ) {
            logger.info(`Commit intentionally rejected by pre-commit hook for URL: ${from_url}`);
          } else {
            logger.error(`SVN reset command failed for URL: ${from_url}`, { 
              error: stderr.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
                .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
            });
          }
          return;
        }

        // Handle successful stdout and look for externals information
        if (stdout) {
          const maskedStdout = stdout
            .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
            .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
          
          // Look for externals-related information in the output
          const lines = maskedStdout.split('\n');
          const externalsInfo = lines.filter(line => 
            line.toLowerCase().includes('external') || 
            line.includes('svn:externals') ||
            line.includes('Fetching external') ||
            line.includes('Updated external') ||
            line.includes('Switched to') ||
            line.includes('At revision')
          );
          
          if (externalsInfo.length > 0) {
            logger.info(`SVN reset triggered externals update for URL: ${from_url}`, {
              externalsChanges: externalsInfo
            });
            
            // Log each external change separately for better visibility
            externalsInfo.forEach((external, index) => {
              logger.info(`Reset external change ${index + 1}: ${external}`);
            });
          } else {
            logger.info(`SVN reset command completed successfully for URL: ${from_url}`, {
              output: maskedStdout
            });
          }
        } else {
          logger.info(`SVN reset command completed successfully for URL: ${from_url}`);
        }
      });
    });
  } catch (err) {
    logger.error('SVN Reset Error:', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    return NextResponse.json(
      { 
        response: { 
          success: "0", 
          output: 'Internal server error during SVN reset' 
        } 
      }, 
      { status: 500 }
    );
  }
}
