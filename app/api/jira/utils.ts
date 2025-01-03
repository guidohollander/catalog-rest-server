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
  try {
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

    console.log(`JIRA debug: ${method} ${url}`);
    return response.json();
  } catch (err) {
    console.error('Jira API error:', err);
    throw err;
  }
}

export async function jiraGet(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`, 'binary').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`JIRA debug: GET ${url}`);
    return response.json();
  } catch (err) {
    console.error('Jira API error:', err);
    throw err;
  }
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
  // Get all versions of project and check if name already exists
  const versions = await jiraGet(`${JIRA_API_URL}/project/${project}/versions`);
  
  // Check if project fixversion exists
  if (!versions.some((element: JiraVersion) => element.name === versionToAdd)) {
    const data = {
      archived: false,
      releaseDate: new Date().toISOString().split('T')[0],
      name: versionToAdd,
      projectId: versions[0].projectId,
      released: isReleased,
    };
    
    const result = await jiraPost('POST', `${JIRA_API_URL}/version`, data);
    return result.self || null;
  }
  
  return null;
}

export async function updateMultipleJiraIssueFixVersions(
  issueNumbers: string[],
  fixVersion: string
): Promise<{ [key: string]: string | null }> {
  // Prepare the bulk update payload
  const issueUpdates = issueNumbers.map(issueKey => ({
    issueKey,
    update: {
      fixVersions: [{ add: { name: fixVersion } }]
    }
  }));

  const data = {
    issueUpdates
  };

  try {
    const result = await jiraPost(
      'POST',
      `${JIRA_API_URL}/bulk`,
      data
    );

    // Process the results into a map of issueKey -> result
    const resultMap: { [key: string]: string | null } = {};
    issueNumbers.forEach((issueKey, index) => {
      resultMap[issueKey] = result.data?.[index]?.self || null;
    });

    return resultMap;
  } catch (error) {
    console.error('Bulk update failed:', error);
    // Return a map of all failures if the bulk operation fails
    return issueNumbers.reduce((acc, issueKey) => {
      acc[issueKey] = null;
      return acc;
    }, {} as { [key: string]: null });
  }
}
