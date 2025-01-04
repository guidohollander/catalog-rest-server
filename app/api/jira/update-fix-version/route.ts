import { NextRequest, NextResponse } from 'next/server';
import { updateMultipleJiraIssueFixVersions } from '../utils';
import { logger } from '@/src/utils/logger';

// Explicitly set runtime to nodejs
export const runtime = 'nodejs';

interface IssueNumber {
  issueNumber: string;
}

interface UpdateFixVersionRequest {
  request: {
    fixVersion: string;
  };
  issueNumbers: IssueNumber[];
}

interface UpdateFixVersionResponse {
  response: {
    successful: IssueNumber[];
    failed: IssueNumber[];
    versionUrl?: string;
  };
}

/**
 * Handles bulk updates of Jira issue fix versions
 * @param request The incoming HTTP request
 * @returns NextResponse with the result of the bulk update operation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let requestBody: UpdateFixVersionRequest = {
    request: { fixVersion: '' },
    issueNumbers: []
  };
  try {
    requestBody = await request.json() as UpdateFixVersionRequest;
    const fixVersion = requestBody.request.fixVersion;
    const issueNumbers = requestBody.issueNumbers.map(issue => issue.issueNumber);

    logger.debug('Received fix version update request', { 
      issueCount: issueNumbers?.length,
      fixVersion,
      method: request.method,
      url: request.url
    });

    if (!issueNumbers?.length || !fixVersion) {
      logger.warn('Invalid request: missing required fields', {
        hasIssueNumbers: !!issueNumbers?.length,
        hasFixVersion: !!fixVersion
      });

      return NextResponse.json<UpdateFixVersionResponse>({ 
        response: {
          successful: [],
          failed: requestBody.issueNumbers,
          versionUrl: undefined
        }
      }, { status: 400 });
    }

    // Perform the update
    const resultMap = await updateMultipleJiraIssueFixVersions(issueNumbers, fixVersion);
    
    // Process the result map into successful and failed arrays with the original structure
    const successful: IssueNumber[] = [];
    const failed: IssueNumber[] = [];
    let versionUrl: string | undefined;

    Object.entries(resultMap).forEach(([issueKey, result]) => {
      const issueNumber: IssueNumber = { issueNumber: issueKey };
      if (result) {
        successful.push(issueNumber);
        // Keep the first non-null result as the version URL
        if (result !== 'skip' && !versionUrl) {
          versionUrl = result;
        }
      } else {
        failed.push(issueNumber);
      }
    });

    // If we don't have a direct URL but have successes, construct the version URL
    if (!versionUrl && successful.length > 0) {
      const projectKey = successful[0].issueNumber.split('-')[0];
      versionUrl = `${config.services.jira.baseUrl}/projects/${projectKey}/versions`;
    }

    return NextResponse.json<UpdateFixVersionResponse>({
      response: {
        successful,
        failed,
        versionUrl
      }
    });

  } catch (error) {
    logger.error('Error updating Jira fix versions', { error });
    
    return NextResponse.json<UpdateFixVersionResponse>({
      response: {
        successful: [],
        failed: requestBody.issueNumbers,
        versionUrl: undefined
      }
    }, { status: 500 });
  }
}
