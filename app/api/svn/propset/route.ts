import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info("SVN Propset Request", { 
      body: { 
        ...body, 
        req: { 
          ...body.req, 
          url: body.req?.url 
        } 
      } 
    });

    // Generate a unique file name for the temporary file
    const fMod = `ext_mod_${crypto.randomBytes(8).toString('hex')}`;
    const fullPath = path.join('/tmp', fMod);

    // Write the external definitions to a temporary file
    fs.writeFileSync(fullPath, body.req.externals);

    try {
      // Prepare the SVN command
      const svnCommand = `svnmucc propsetf svn:externals ${fullPath} -m "${body.req.key}" ${body.req.url} --username ${svn_username} --password ${svn_password}`;
      
      // Log command with sensitive data masked
      const maskedCommand = svnCommand
        .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
        .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
      logger.debug(`Executing SVN propset command: ${maskedCommand}`);

      // Execute the SVN command synchronously
      const stdout = execSync(svnCommand);
      
      // Log success with masked output
      logger.info(`SVN propset completed successfully`, {
        output: stdout.toString()
          .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
          .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
      });

      // Send a success response
      return NextResponse.json({ 
        response: { 
          success: "1", 
          output: "propset successful" 
        } 
      }, { 
        status: 200 
      });
    } finally {
      // Clean up: Remove the temporary file
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    // Log error with sensitive data masked
    logger.error("Error executing SVN propset command:", {
      error: error instanceof Error 
        ? error.message.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
            .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
        : String(error).replace(new RegExp(svn_password, 'g'), '***REDACTED***')
            .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
    });
    return NextResponse.json({ 
      response: { 
        success: "0", 
        error: "error" 
      } 
    }, { 
      status: 500 
    });
  }
}