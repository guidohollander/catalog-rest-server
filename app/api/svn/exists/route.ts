import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const url = requestBody.request?.url;
    console.log(`SVN exists API called for URL: ${url}`);

    // Input validation
    if (!url) {
      return NextResponse.json({ 
        response: { 
          exists: false,
          error: "SVN URL is required"
        } 
      }, { status: 400 });
    }

    // SVN credentials check
    if (!svn_username || !svn_password) {
      console.error('SVN credentials not found in config or environment');
      return NextResponse.json({ 
        response: { 
          exists: false,
          error: "SVN credentials not configured"
        } 
      }, { status: 500 });
    }

    // Construct SVN info command 
    const svnInfoCommand = `svn info "${url}" --username ${svn_username} --password ${svn_password}`;

    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnInfoCommand, (error, stdout, stderr) => {
        if (error) {
          // Check if it's just a "not found" error
          if (stderr.includes("non-existent in revision") || stderr.includes("doesn't exist")) {
            resolve(NextResponse.json({ 
              response: { 
                exists: false 
              } 
            }));
          } else {
            // Log only unexpected errors
            console.error('URL does not exist or access failed:', url);
            resolve(NextResponse.json({ 
              response: { 
                exists: false,
                error: "Access failed or unexpected error"
              } 
            }));
          }
        } else {
          resolve(NextResponse.json({ 
            response: { 
              exists: true 
            } 
          }));
        }
      });
    });

  } catch (error) {
    console.error('Unexpected error in SVN exists route:', error);
    return NextResponse.json({ 
      response: { 
        exists: false,
        error: "Internal server error"
      } 
    }, { status: 500 });
  }
}
