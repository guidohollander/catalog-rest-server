import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '@/src/config/loader';
import logger from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    logger.info("latest-revision - SVN Request", { body: { ...body, request: { ...body.request, url: body.request?.url } } });

    const url = body.request?.url;

    if (!url) {
      return NextResponse.json({ 
        response: { 
          validUrl: "0", 
          error: "URL is required" 
        } 
      }, { status: 400 });
    }
    
    const svnInfoCommand = `svn info "${url}" --username ${svn_username} --password ${svn_password}`;

    // Log command with sensitive data masked
    const maskedCommand = svnInfoCommand
      .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
      .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
    logger.debug(`Executing SVN info command: ${maskedCommand}`);

    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnInfoCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Error executing svn info:`, { 
            error: error.message.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
              .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
          });
          resolve(NextResponse.json({ 
            response: { 
              validUrl: "0", 
              error: "URL does not exist" 
            } 
          }));
          return;
        }

        if (stderr) {
          logger.error(`SVN info error`, { 
            stderr: stderr.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
              .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
          });
          resolve(NextResponse.json({ 
            response: { 
              validUrl: "0", 
              error: "SVN info failed" // Don't expose internal error messages
            } 
          }));
          return;
        }

        // Mask sensitive data in stdout before processing
        const maskedStdout = stdout.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
          .replace(new RegExp(svn_username, 'g'), '***REDACTED***');

        // Extract revision and date
        const revisionMatch = maskedStdout.match(/Last Changed Rev:\s*(\d+)/);
        const dateMatch = maskedStdout.match(/Last Changed Date:\s*(.*)/);

        if (revisionMatch && dateMatch) {
          const latest_revision = revisionMatch[1];
          const releaseDateRaw = dateMatch[1];
          const release_date = new Date(releaseDateRaw).toISOString().split("T")[0];

          resolve(NextResponse.json({
            response: {
              latest_revision: latest_revision,
              release_date: release_date,
            },
          }));
        } else {
          logger.error("Unable to extract revision or release date from svn info output", {
            output: maskedStdout
          });

          resolve(NextResponse.json({
            response: {
              validUrl: "0",
              error: "Unable to extract revision or release date",
            },
          }));
        }
      });
    });
  } catch (error) {
    logger.error("Error in SVN latest-revision route:", { 
      error: (error as Error).message.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
        .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
    });
    return NextResponse.json({ 
      response: { 
        validUrl: "0",
        error: "Internal server error" 
      } 
    }, { status: 500 });
  }
}
