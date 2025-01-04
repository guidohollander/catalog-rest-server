import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

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
    logger.error('Jira API error', {
      status: response.status,
      statusText: response.statusText,
      url,
      method,
    });
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content responses (common for PUT requests)
  if (response.status === 204) {
    // For version updates, extract ID from URL
    const versionId = url.split('/').pop();
    return {
      self: versionId ? `/rest/api/latest/version/${versionId}` : undefined,
      data: null
    };
  }

  const responseData = await response.json();
  return {
    self: responseData?.self,
    data: responseData,
  };
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

  logger.debug(`JIRA debug: ${response.status === 204 ? '' : 'GET'} ${url}`);
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function updateJiraIssueFixVersion(
  issueNumber: string,
  fixVersion: string
): Promise<string | null> {
  try {
    const data = {
      update: {
        fixVersions: [{ add: { name: fixVersion } }],
      },
    };
    
    logger.info('Updating issue fix version', { issueNumber, fixVersion });
    
    const result = await jiraPost(
      'PUT',
      `${JIRA_API_URL}/issue/${issueNumber}?notifyUsers=false`,
      data
    );
    
    // For PUT requests to /issue endpoint, a 204 response with no content is success
    // The result.self will be undefined in this case
    return 'success';
  } catch (error) {
    logger.error('Failed to update issue fix version', { error, issueNumber, fixVersion });
    return null;
  }
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
    const versions = await jiraGet(`${JIRA_API_URL}/project/${project}/versions`);
    
    // If versions is null (404) or has no values, skip version check
    if (!versions || !Array.isArray(versions)) {
      logger.warn('No versions found for project', { project });
      return 'skip';
    }
    
    // Check if project fixversion exists
    const existingVersion = versions.find((element: JiraVersion) => element.name === versionToAdd);
    if (!existingVersion) {
      const data = {
        archived: false,
        releaseDate: new Date().toISOString().split('T')[0],
        name: versionToAdd,
        project: project,
        released: isReleased,
        description: `Version ${versionToAdd} created by Service Catalog`,
      };
      
      try {
        logger.info('Creating new version', { project, versionToAdd, isReleased });
        const result = await jiraPost('POST', `${JIRA_API_URL}/version`, data);
        // Extract version ID from self URL and construct web UI URL
        const versionId = result.self?.split('/').pop();
        return versionId ? `${baseUrl}/projects/${project}/versions/${versionId}` : null;
      } catch (error) {
        // If version creation fails, just skip
        logger.error('Failed to create Jira version', { error, project, versionToAdd });
        return 'skip';
      }
    } else if (!existingVersion.released && isReleased) {
      // Update existing version to be released if it's not already
      try {
        logger.info('Updating existing version to released', { 
          project, 
          versionToAdd,
          versionId: existingVersion.id 
        });
        
        const data = {
          id: existingVersion.id,
          name: existingVersion.name,
          archived: existingVersion.archived,
          released: true,
          releaseDate: new Date().toISOString().split('T')[0],
          description: existingVersion.description || `Version ${versionToAdd} updated by Service Catalog`,
          projectId: existingVersion.projectId,
        };
        
        const result = await jiraPost('PUT', `${JIRA_API_URL}/version/${existingVersion.id}`, data);
        logger.info('Successfully updated version', { project, versionToAdd });
        return `${baseUrl}/projects/${project}/versions/${existingVersion.id}`;
      } catch (error) {
        logger.error('Failed to update Jira version release status', { error, project, versionToAdd });
      }
    } else {
      logger.info('Version already exists and is in correct state', { 
        project, 
        versionToAdd,
        currentlyReleased: existingVersion.released,
        wantReleased: isReleased
      });
      return `${baseUrl}/projects/${project}/versions/${existingVersion.id}`;
    }
    
    return `${baseUrl}/projects/${project}/versions/${existingVersion.id}`;
  } catch (error) {
    // Any other errors, just skip version management
    logger.error('Error in version management', { error, project, versionToAdd });
    return 'skip';
  }
}

export async function updateMultipleJiraIssueFixVersions(
  issueNumbers: string[],
  fixVersion: string
): Promise<{ [key: string]: string | null }> {
  const resultMap: { [key: string]: string | null } = {};
  let versionUrl: string | null = null;

  // Process each issue one by one since Jira's bulk API is limited
  for (const issueKey of issueNumbers) {
    try {
      // Add version to project if it doesn't exist, and ensure it's released
      const projectKey = issueKey.split('-')[0];
      const versionResult = await addVersionIfNotExists(projectKey, fixVersion, true);
      
      // Store the version URL for the response
      if (versionResult && versionResult !== 'skip') {
        versionUrl = versionResult;
      }

      if (versionResult === 'skip') {
        resultMap[issueKey] = null;
      } else {
        // Update the issue's fix version
        try {
          await jiraPost(
            'PUT',
            `${JIRA_API_URL}/issue/${issueKey}`,
            {
              update: {
                fixVersions: [{ add: { name: fixVersion } }]
              }
            }
          );
          // Return the version URL instead of the issue URL
          resultMap[issueKey] = versionUrl;
        } catch (error) {
          // Handle 404 silently - issue doesn't exist
          if (error instanceof Error && error.message.includes('404')) {
            resultMap[issueKey] = null;
          } else {
            // Log other errors that might need attention
            logger.error(`Error updating ${issueKey}:`, error);
            resultMap[issueKey] = null;
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to process ${issueKey}:`, error);
      resultMap[issueKey] = null;
    }
  }

  return resultMap;
}
