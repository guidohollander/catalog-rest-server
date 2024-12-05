import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("SVN Request Body:", body);

    // Generate a unique file name for the temporary file
    const fMod = `ext_mod_${crypto.randomBytes(8).toString('hex')}`;
    const fullPath = path.join('/tmp', fMod);

    // Write the external definitions to a temporary file
    fs.writeFileSync(fullPath, body.req.externals);

    try {
      // Prepare the SVN command
      const svnCommand = `svnmucc propsetf svn:externals ${fullPath} -m "${body.req.key}" ${body.req.url} --username ${svn_username} --password ${svn_password}`;
      console.log(svnCommand);

      // Execute the SVN command synchronously
      const stdout = execSync(svnCommand);
      console.log(`svnmucc stdout: ${stdout.toString()}`);

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
    console.error("Error executing SVN command:", error);
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