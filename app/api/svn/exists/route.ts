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
    // Log the entire incoming request for debugging
    const requestBody = await request.json();
    console.log('SVN Exists - Full Request Body:', JSON.stringify(requestBody, null, 2));

    const url = requestBody.request?.url;

    // Extensive input validation
    if (!url) {
      console.error('SVN Exists - No URL provided');
      return NextResponse.json({ 
        response: { 
          exists: false,
          error: "SVN URL is required"
        } 
      }, { status: 400 });
    }

    // Log SVN credentials security check
    if (!svn_username || !svn_password) {
      console.error('SECURITY ERROR: SVN credentials not found in config or environment');
      return NextResponse.json({ 
        response: { 
          exists: false,
          error: "SVN credentials not configured"
        } 
      }, { status: 500 });
    }

    // Construct SVN info command 
    const svnInfoCommand = `svn info "${url}" --username ${svn_username} --password ${svn_password}`;
    console.log('SVN Exists - Executing Command:', svnInfoCommand);

    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnInfoCommand, (error, stdout, stderr) => {
        // Log all execution details
        console.log('SVN Exists - Command Execution Details:');
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        console.log('ERROR:', error);

        if (error) {
          console.log(`URL does not exist or access failed: ${url}`);
          console.log('Error Details:', {
            message: error.message,
            code: error.code,
            signal: error.signal
          });

          resolve(NextResponse.json({ 
            response: { 
              exists: false 
            } 
          }));
          return;
        }

        if (stderr) {
          console.error(`SVN check stderr: ${stderr}`);
        }

        console.log(`URL exists: ${url}`);
        resolve(NextResponse.json({ 
          response: { 
            exists: true 
          } 
        }));
      });
    });
  } catch (error) {
    console.error("Critical error in SVN exists route:", error);
    return NextResponse.json({ 
      response: { 
        exists: false,
        error: "Internal server error"
      } 
    }, { status: 500 });
  }
}
