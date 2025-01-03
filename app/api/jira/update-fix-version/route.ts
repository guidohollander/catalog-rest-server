import { NextRequest, NextResponse } from 'next/server';
import { updateMultipleJiraIssueFixVersions } from '../utils';
import logger from '@/src/utils/logger';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

interface RequestBody {
  issueNumbers: string[];
  fixVersion: string;
}

interface ErrorResponse {
  error: string;
  details?: Record<string, string[]>;
  failedIssues?: string[];
}

interface SuccessResponse {
  success: true;
  result: {
    successful: string[];
    failed: string[];
    errors: Record<string, string[]>;
  };
}

/**
 * Handles bulk updates of Jira issue fix versions
 * @param request The incoming HTTP request
 * @returns NextResponse with the result of the bulk update operation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RequestBody;
    const { issueNumbers, fixVersion } = body;

    logger.debug('Received fix version update request', { 
      issueCount: issueNumbers?.length,
      fixVersion,
      method: request.method,
      url: request.url
    });

    if (!issueNumbers?.length) {
      logger.warn('Invalid request: missing or empty issueNumbers', {
        issueCount: issueNumbers?.length
      });

      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid required field: issueNumbers' },
        { status: 400 }
      );
    }

    if (!fixVersion?.trim()) {
      logger.warn('Invalid request: missing or empty fixVersion', {
        fixVersion,
        issueCount: issueNumbers?.length
      });

      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid required field: fixVersion' },
        { status: 400 }
      );
    }

    const resultMap = await updateMultipleJiraIssueFixVersions(issueNumbers, fixVersion);
    
    // Process the result map into successful and failed arrays
    const successful: string[] = [];
    const failed: string[] = [];
    const errors: Record<string, string[]> = {};

    Object.entries(resultMap).forEach(([issueKey, result]) => {
      if (result) {
        successful.push(issueKey);
      } else {
        failed.push(issueKey);
        errors[issueKey] = ['Failed to update fix version'];
      }
    });
    
    if (failed.length === issueNumbers.length) {
      logger.error('All Jira updates failed', { 
        fixVersion,
        failedCount: failed.length,
        errorCount: Object.keys(errors).length,
        firstError: Object.entries(errors)[0]
      });

      return NextResponse.json<ErrorResponse>(
        { 
          error: 'All updates failed', 
          details: errors,
          failedIssues: failed 
        },
        { status: 500 }
      );
    }

    logger.info('Jira updates completed', {
      fixVersion,
      totalCount: issueNumbers.length,
      successCount: successful.length,
      failureCount: failed.length,
      hasPartialFailures: failed.length > 0
    });

    return NextResponse.json<SuccessResponse>({ 
      success: true,
      result: {
        successful,
        failed,
        errors
      }
    });
  } catch (error) {
    logger.error('Unexpected error during Jira update:', { 
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : String(error)
    });
    
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
