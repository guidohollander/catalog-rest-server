import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const { from_url } = requestBody.request;

    if (!from_url) {
      return NextResponse.json(
        { error: 'SVN URL is required' }, 
        { status: 400 }
      );
    }

    return new Promise((resolve, reject) => {
      // Generate a temporary file name to use for SVN modification
      const fMod = `ext_mod_${crypto.randomBytes(8).toString("hex")}`;
      fs.writeFileSync(fMod, "");

      // Construct the SVN command to add a .no-op file to the target URL
      const svnCommand = `svnmucc put ${fMod} -m "reset" ${from_url}.no-op --username ${svn_username} --password ${svn_password}`;
      console.log(svnCommand);

      // Execute the SVN command asynchronously
      exec(svnCommand, (error, stdout, stderr) => {
        // Clean up the temporary file after command execution
        fs.unlinkSync(fMod);

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
            console.log("Commit intentionally rejected by pre-commit hook.");
          } else {
            console.error(`Other SVN error: ${stderr}`);
          }
          return;
        }

        // Handle successful stdout (optional)
        console.log(`svnmucc stdout: ${stdout}`);
      });
    });
  } catch (err) {
    console.error('SVN Reset Error:', err);
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
