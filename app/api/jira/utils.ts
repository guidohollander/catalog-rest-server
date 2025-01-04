import { loadConfig } from '@/src/config/loader';

const config = loadConfig();
const { baseUrl, apiPath, username, password } = config.services.jira;
const JIRA_API_URL = `${baseUrl}${apiPath}`;

interface JiraVersion {
  self: string;
  id: string;
  name: string;
  archived: boolean;
  released: boolean;
  projectId: number;
  releaseDate?: string;
}

interface JiraResponse {
  self?: string;
  data?: any;
}

export async function jiraPost(
  method: 'POST' | 'PUT',
  url: string,
  data: any
): Promise<JiraResponse> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`, 'binary').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // For PUT requests that return no content (204), return a success indicator
  if (method === 'PUT' && response.status === 204) {
    return { self: 'success' };
  }

  // For other requests, try to parse JSON
  const text = await response.text();
  if (!text) {
    return { self: 'success' };
  }
  
  return JSON.parse(text);
}

export async function jiraGet(url: string): Promise<any> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`, 'binary').toString('base64')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  console.log(`JIRA debug: ${response.status === 204 ? '' : 'GET'} ${url}`);
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function updateJiraIssueFixVersion(
  issueNumber: string,
  fixVersion: string
): Promise<string | null> {
  const data = {
    update: {
      fixVersions: [{ add: { name: fixVersion } }],
    },
  };
  
  const result = await jiraPost(
    'PUT',
    `${JIRA_API_URL}/issue/${issueNumber}?notifyUsers=false`,
    data
  );
  
  return result.self || null;
}

export async function getJiraIssue(issueNumber: string): Promise<any> {
  return jiraGet(`${JIRA_API_URL}/issue/${issueNumber}`);
}

export async function addVersionIfNotExists(
  project: string,
  versionToAdd: string,
  isReleased: boolean
): Promise<string | null> {
  try {
    const versions = await jiraGet(`${JIRA_API_URL}/project/${project}/version`);
    
    // If versions is null (404) or has no values, skip version check
    if (!versions || !versions.values) {
      return 'skip';
    }
    
    // Check if project fixversion exists
    if (!versions.values.some((element: JiraVersion) => element.name === versionToAdd)) {
      const data = {
        archived: false,
        releaseDate: new Date().toISOString().split('T')[0],
        name: versionToAdd,
        project: project,
        released: isReleased,
      };
      
      try {
        const result = await jiraPost('POST', `${JIRA_API_URL}/version`, data);
        return result.self || null;
      } catch (error) {
        // If version creation fails, just skip
        return 'skip';
      }
    }
    
    return 'exists';
  } catch (error) {
    // Any other errors, just skip version management
    return 'skip';
  }
}

export async function updateMultipleJiraIssueFixVersions(
  issueNumbers: string[],
  fixVersion: string
): Promise<{ [key: string]: string | null }> {
  const resultMap: { [key: string]: string | null } = {};

  // Process each issue one by one since Jira's bulk API is limited
  for (const issueKey of issueNumbers) {
    try {
      // Add version to project if it doesn't exist
      const projectKey = issueKey.split('-')[0];
      const versionResult = await addVersionIfNotExists(projectKey, fixVersion, false);
      if (versionResult === 'skip') {
        resultMap[issueKey] = 'version skipped';
      } else {
        // Update the issue's fix version
        try {
          const result = await jiraPost(
            'PUT',
            `${JIRA_API_URL}/issue/${issueKey}`,
            {
              update: {
                fixVersions: [{ add: { name: fixVersion } }]
              }
            }
          );
          resultMap[issueKey] = result.self || 'success';
        } catch (error) {
          // Handle 404 silently - issue doesn't exist
          if (error instanceof Error && error.message.includes('404')) {
            resultMap[issueKey] = null;
          } else {
            // Log other errors that might need attention
            console.error(`Error updating ${issueKey}:`, error);
            resultMap[issueKey] = null;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process ${issueKey}:`, error);
      resultMap[issueKey] = null;
    }
  }

  return resultMap;
}
