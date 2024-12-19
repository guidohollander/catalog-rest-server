import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

function checkUrl(url: string): Promise<{ url: string; exists: boolean; error?: string }> {
  return new Promise((resolve) => {
    const svnInfoCommand = `svn info "${url}" --username ${svn_username} --password ${svn_password}`;
    
    exec(svnInfoCommand, (error, stdout, stderr) => {
      if (error || stderr) {
        // Check if it's just a "not found" error
        if (stderr?.includes("non-existent in revision") || stderr?.includes("doesn't exist")) {
          resolve({ url, exists: false });
        } else {
          resolve({ 
            url, 
            exists: false, 
            error: "Access failed or unexpected error" 
          });
        }
      } else {
        resolve({ url, exists: true });
      }
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const urls = body.request?.urls;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ 
        response: { 
          error: "URLs array is required" 
        } 
      }, { status: 400 });
    }

    // SVN credentials check
    if (!svn_username || !svn_password) {
      console.error('SVN credentials not found in config or environment');
      return NextResponse.json({ 
        response: { 
          error: "SVN credentials not configured" 
        } 
      }, { status: 500 });
    }

    // Check all URLs in parallel
    const results = await Promise.all(urls.map(url => checkUrl(url)));
    
    return NextResponse.json({ 
      response: { 
        results 
      } 
    });

  } catch (error) {
    console.error('Error in SVN bulk-exists route:', error);
    return NextResponse.json({ 
      response: { 
        error: "Internal server error" 
      } 
    }, { status: 500 });
  }
}
