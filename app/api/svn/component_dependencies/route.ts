import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { loadConfig, loadEnvironmentOverrides } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

const config = loadEnvironmentOverrides(loadConfig());
const svnUsername = config.services.svn.username;
const svnPassword = config.services.svn.password;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskSvnCredentials(value: string): string {
  return value
    .replace(new RegExp(escapeRegExp(svnPassword), 'g'), '***REDACTED***')
    .replace(new RegExp(escapeRegExp(svnUsername), 'g'), '***REDACTED***');
}

function resetComponentDependenciesViaSvnHook(fromUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fMod = `component_dependencies_${crypto.randomBytes(8).toString('hex')}`;
    const fullPath = path.join(os.tmpdir(), fMod);
    fs.writeFileSync(fullPath, '');

    const resetUrl = `${fromUrl.replace(/\/+$/, '')}/.no-op`;
    const command = [
      'svnmucc',
      '--non-interactive',
      '--trust-server-cert',
      'put',
      `"${fullPath}"`,
      '-m "refresh component dependencies"',
      `"${resetUrl}"`,
      `--username "${svnUsername}"`,
      `--password "${svnPassword}"`,
    ].join(' ');

    logger.info(`Triggering SVN hook refresh for component dependencies: ${fromUrl}`, {
      command: maskSvnCredentials(command),
    });

    exec(command, (error, stdout, stderr) => {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Best effort cleanup only.
      }

      const combinedOutput = `${stdout || ''}\n${stderr || ''}`.trim();
      const maskedOutput = maskSvnCredentials(combinedOutput);

      if (error) {
        if (maskedOutput.includes('Commit rejected: adding or modifying a .no-op file is not allowed.')) {
          logger.info(`SVN hook refresh triggered for ${fromUrl}`, {
            output: maskedOutput,
          });
          resolve();
          return;
        }

        logger.error(`Failed to trigger SVN hook refresh for ${fromUrl}`, {
          error: maskSvnCredentials(error.message),
          output: maskedOutput,
        });
        reject(error);
        return;
      }

      logger.info(`SVN hook refresh command completed for ${fromUrl}`, {
        output: maskedOutput,
      });
      resolve();
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const fromUrl = requestBody.request?.from_url;

    if (!fromUrl || typeof fromUrl !== 'string' || !fromUrl.trim()) {
      return NextResponse.json(
        {
          response: {
            success: '0',
            dependency_count: '0',
          },
        },
        { status: 400 },
      );
    }

    await resetComponentDependenciesViaSvnHook(fromUrl.trim());

    return NextResponse.json({
      response: {
        success: '1',
        dependency_count: '0',
        output: 'component dependency refresh triggered',
      },
    });
  } catch (error) {
    logger.error('Failed to refresh component dependencies', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        response: {
          success: '0',
          dependency_count: '0',
        },
      },
      { status: 500 },
    );
  }
}
