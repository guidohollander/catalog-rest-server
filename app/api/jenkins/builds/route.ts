import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

// Jenkins credentials and server details
const jenkinsBaseUrl = config.services.jenkins.baseUrl;
const username = config.services.jenkins.username;
const apiToken = config.services.jenkins.apiToken;

// Interfaces for type safety
interface JenkinsJob {
  name: string;
  url: string;
}

interface BuildInfo {
  repository: string;
  branch: string;
  buildNumber: number;
  buildUrl: string;
  timestamp: number;
}

// Function to encode job paths safely
function encodeJobPath(jobPath: string): string {
  return jobPath.split('/').map(encodeURIComponent).join('/');
}

// Function to get the correct encoded path for tags or branches
function getEncodedBranchPath(branch: string): string {
  return branch.startsWith('tags/') 
    ? branch.replace('tags/', 'tags%252F')
    : encodeJobPath(branch);
}

// Fetch the list of jobs under a top-level repository (e.g., AIA_MBS)
function getBranches(repoName: string): Promise<JenkinsJob[]> {
  return new Promise((resolve) => {
    const encodedRepoName: string = encodeJobPath(repoName);
    const options: http.RequestOptions = {
      hostname: jenkinsBaseUrl.replace('http://', ''),
      path: `/job/${encodedRepoName}/api/json`,
      method: 'GET',
      auth: `${username}:${apiToken}`
    };

    const req: http.ClientRequest = http.request(options, (res: http.IncomingMessage) => {
      let data: string = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        try {
          const jobInfo: { jobs?: JenkinsJob[] } = JSON.parse(data);
          resolve(jobInfo.jobs || []);
        } catch {
          resolve([]);
        }
      });

      res.on('error', () => {
        resolve([]);
      });
    });

    req.on('error', () => {
      resolve([]);
    });

    req.end();
  });
}

// Fetch the last build for a branch (job)
async function getLastBuild(branchPath: string): Promise<BuildInfo | null> {
  return new Promise((resolve) => {
    const encodedBranchPath: string = getEncodedBranchPath(branchPath);
    const options: http.RequestOptions = {
      hostname: jenkinsBaseUrl.replace('http://', ''),
      path: `/job/${encodedBranchPath}/lastBuild/api/json`,
      method: 'GET',
      auth: `${username}:${apiToken}`
    };

    const req: http.ClientRequest = http.request(options, (res: http.IncomingMessage) => {
      let data: string = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        try {
          const buildInfo: { 
            number: number, 
            url: string, 
            timestamp: number 
          } = JSON.parse(data);
          resolve({
            repository: branchPath.split('/')[0],
            branch: branchPath.split('/').slice(1).join('/'),
            buildNumber: buildInfo.number,
            buildUrl: buildInfo.url,
            timestamp: buildInfo.timestamp
          });
        } catch {
          resolve(null);
        }
      });

      res.on('error', () => {
        resolve(null);
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.end();
  });
}

// Function to process each repository and find the most recent build for all its branches
async function processRepository(repoPath: string): Promise<BuildInfo[]> {
  const branches: JenkinsJob[] = await getBranches(repoPath);
  
  const buildPromises: Promise<BuildInfo | null>[] = branches.map(branch => 
    getLastBuild(`${repoPath}/${branch.name}`)
  );

  const builds: (BuildInfo | null)[] = await Promise.all(buildPromises);
  
  return builds.filter((build): build is BuildInfo => build !== null);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const repositories: string[] = [
      'AIA_MBS',
      'AIA_MTS',
      'SOLUTIONCOMPONENTS'
    ];

    const allBuildsPromises: Promise<BuildInfo[]>[] = repositories.map(processRepository);
    const allBuilds: BuildInfo[][] = await Promise.all(allBuildsPromises);

    return NextResponse.json(allBuilds.flat());
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Jenkins builds' }, { status: 500 });
  }
}
