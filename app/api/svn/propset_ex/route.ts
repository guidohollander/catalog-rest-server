import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

/**
 * SVN Propset Extended API Route
 * 
 * This route modifies svn:externals properties by applying targeted replacements
 * instead of requiring the complete externals string. This solves payload size
 * limitations when dealing with large externals.
 * 
 * Request Body:
 * {
 *   "req": {
 *     "key": string,           // Commit message for the SVN change
 *     "url": string,           // SVN repository URL where externals property exists
 *     "replacement": [         // Array of replacement operations to apply
 *       {
 *         "externals_row": string,     // The exact externals line to find (with double quotes)
 *         "externals_row_to": string   // The replacement externals line (with double quotes)
 *       }
 *     ]
 *   }
 * }
 * 
 * Process:
 * 1. Retrieves current svn:externals from the specified URL
 * 2. Normalizes single quotes to double quotes for consistent matching
 * 3. Applies each replacement sequentially
 * 4. Converts double quotes back to single quotes (SVN format)
 * 5. Commits changes back to SVN using svnmucc
 * 
 * Response:
 * {
 *   "response": {
 *     "success": "1" | "0"
 *   }
 * }
 * 
 * Note: The URL does NOT need .no-op suffix (unlike the reset route)
 */

// Load configuration
const config = loadConfig();

const svn_username = config.services.svn.username;
const svn_password = config.services.svn.password;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
        
    // Extract the replacement data from the request
    // Note: The request uses 'replacement' (singular) not 'replacements' (plural)
    const { key, url, replacement } = body.req;
    const replacements = replacement; // Rename for clarity in the rest of the code

    // Validate that replacements is an array
    if (!Array.isArray(replacements) || replacements.length === 0) {
      logger.error("Invalid replacements data", {
        replacements,
        type: typeof replacements
      });
      return NextResponse.json({ 
        response: { 
          success: "0"
        } 
      }, { 
        status: 400 
      });
    }

    // Get the current svn:externals property
    const getCurrentExternals = `svn propget svn:externals ${url} --username ${svn_username} --password ${svn_password}`;
    
    // Log command with sensitive data masked
    const maskedGetCurrentCommand = getCurrentExternals
      .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
      .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
    logger.info(`Getting current SVN externals: ${maskedGetCurrentCommand}`);

    // Execute the command to get current externals
    const rawExternals = execSync(getCurrentExternals, { encoding: 'utf-8' });
    
    // Normalize quotes: replace single quotes with double quotes to match replacement format
    let currentExternals = rawExternals.trim().replace(/'/g, '"');
    
    // If no externals exist yet, start with empty string
    if (!currentExternals || currentExternals === '') {
      logger.warn("No existing externals found, starting with empty externals");
      currentExternals = '';
    }
    
    // Apply all replacements to the current externals
    let newExternals = currentExternals;
    const appliedReplacements: Array<{from: string, to: string, found: boolean}> = [];
    
    for (const replacement of replacements) {
      // Extract the externals row to find and the replacement text
      const { externals_row, externals_row_to } = replacement;
      
      const currentExternalsRow = externals_row;
      const newExternalsRow = externals_row_to;
      
      const found = newExternals.includes(currentExternalsRow);
      appliedReplacements.push({
        from: currentExternalsRow,
        to: newExternalsRow,
        found
      });
      
      if (found) {
        newExternals = newExternals.replace(currentExternalsRow, newExternalsRow);
      }
    }
    
    // Generate a unique file name for the temporary file
    const fMod = `ext_mod_${crypto.randomBytes(8).toString('hex')}`;
    const fullPath = path.join('/tmp', fMod);

    // Convert double quotes back to single quotes before writing to SVN
    const externalsForSvn = newExternals.replace(/"/g, "'");

    // Write the new external definitions to a temporary file
    fs.writeFileSync(fullPath, externalsForSvn);

    try {
      // Prepare the SVN command
      const svnCommand = `svnmucc propsetf svn:externals ${fullPath} -m "${key}" ${url} --username ${svn_username} --password ${svn_password}`;
      
      // Log command with sensitive data masked
      const maskedCommand = svnCommand
        .replace(new RegExp(svn_password, 'g'), '***REDACTED***')
        .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
      logger.info(`Executing SVN propset command: ${maskedCommand}`);

      // Execute the SVN command synchronously
      const stdout = execSync(svnCommand);
      
      // Log success with details
      const appliedCount = appliedReplacements.filter(r => r.found).length;
      logger.info(`SVN propset_ex completed: ${appliedCount}/${appliedReplacements.length} replacements applied for ${url}`);

      // Send a success response
      return NextResponse.json({ 
        response: { 
          success: "1"
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
    const errorMessage = error instanceof Error 
      ? error.message.replace(new RegExp(svn_password, 'g'), '***REDACTED***')
          .replace(new RegExp(svn_username, 'g'), '***REDACTED***')
      : String(error).replace(new RegExp(svn_password, 'g'), '***REDACTED***')
          .replace(new RegExp(svn_username, 'g'), '***REDACTED***');
    
    logger.error("Error executing SVN propset_ex command:", {
      error: errorMessage
    });
    
    return NextResponse.json({ 
      response: { 
        success: "0"
      } 
    }, { 
      status: 500 
    });
  }
}
