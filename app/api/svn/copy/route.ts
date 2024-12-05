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
    const body = await request.json();
    console.log("SVN Copy Request Body:", body);

    // Validate request body
    if (!body.request || !body.request.from_url || !body.request.to_url || !body.request.commitmessage) {
      return NextResponse.json({ 
        response: { 
          success: "0", 
          error: "Missing required parameters" 
        } 
      }, { status: 400 });
    }

    const svnCommand = `svn copy "${body.request.from_url}" "${body.request.to_url}" -m "${body.request.commitmessage}" --username ${svn_username} --password ${svn_password}`;
    
    return new Promise<NextResponse>((resolve, reject) => {
      exec(svnCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing svn copy: ${error.message}`);
          resolve(NextResponse.json({ 
            response: { 
              success: "0", 
              error: error.message 
            } 
          }, { status: 500 }));
          return;
        }
        
        if (stderr) {
          console.error(`svn copy stderr: ${stderr}`);
        }
        
        console.log(`svn copy stdout: ${stdout}`);
        
        resolve(NextResponse.json({ 
          response: { 
            success: "1", 
            output: "copy successful" 
          } 
        }));
      });
    });
  } catch (error) {
    console.error("Error in SVN copy route:", error);
    return NextResponse.json({ 
      response: { 
        success: "0", 
        error: "Internal server error" 
      } 
    }, { status: 500 });
  }
}
