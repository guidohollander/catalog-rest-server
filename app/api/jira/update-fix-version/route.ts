import { NextRequest, NextResponse } from 'next/server';
import { updateJiraIssueFixVersion, updateMultipleJiraIssueFixVersions } from '../utils';
import { loadConfig } from '@/src/config/loader';

interface SingleUpdateRequestBody {
  issueNumber: string;
  fixVersion: string;
}

interface BulkUpdateRequestBody {
  issueNumbers: string[];
  fixVersion: string;
}

type RequestBody = SingleUpdateRequestBody | BulkUpdateRequestBody;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const config = loadConfig();
  const expectedAuth = `Basic ${Buffer.from(`${config.services.jira.username}:${config.services.jira.password}`).toString('base64')}`;
  
  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as RequestBody;
    const { fixVersion } = body;

    if (!fixVersion) {
      return NextResponse.json(
        { error: 'Missing required field: fixVersion' },
        { status: 400 }
      );
    }

    if ('issueNumbers' in body) {
      // Bulk update
      if (!body.issueNumbers?.length) {
        return NextResponse.json(
          { error: 'Missing or empty required field: issueNumbers' },
          { status: 400 }
        );
      }

      const results = await updateMultipleJiraIssueFixVersions(body.issueNumbers, fixVersion);
      const hasSuccesses = Object.values(results).some(result => result !== null);

      if (!hasSuccesses) {
        return NextResponse.json(
          { error: 'All updates failed', results },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        results
      });
    } else {
      // Single update
      if (!body.issueNumber) {
        return NextResponse.json(
          { error: 'Missing required field: issueNumber' },
          { status: 400 }
        );
      }

      const result = await updateJiraIssueFixVersion(body.issueNumber, fixVersion);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to update Jira issue' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        result
      });
    }
  } catch (error) {
    console.error('Error updating Jira issue(s):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
