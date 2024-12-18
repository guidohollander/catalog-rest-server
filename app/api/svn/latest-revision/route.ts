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

    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnInfoCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Error executing svn info:`, { error: error.message });
          resolve(NextResponse.json({ 
            response: { 
              validUrl: "0", 
              error: "URL does not exist" 
            } 
          }));
          return;
        }

        if (stderr) {
          logger.error(`svn info stderr:`, { stderr });
          resolve(NextResponse.json({ 
            response: { 
              validUrl: "0", 
              error: stderr 
            } 
          }));
          return;
        }

        // Extract revision and date
        const revisionMatch = stdout.match(/Last Changed Rev:\s*(\d+)/);
        const dateMatch = stdout.match(/Last Changed Date:\s*(.*)/);

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
          logger.error("Unable to extract revision or release date from svn info output");

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
    logger.error("Error in SVN latest-revision route:", { error });
    return NextResponse.json({ 
      response: { 
        validUrl: "0",
        error: "Internal server error" 
      } 
    }, { status: 500 });
  }
}
