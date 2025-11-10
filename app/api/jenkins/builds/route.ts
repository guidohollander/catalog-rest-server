import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';
import { loadConfig } from '@/src/config/loader';
import { logger } from '@/src/utils/logger';

// Load configuration
const config = loadConfig();

// Jenkins credentials and server details
const jenkinsBaseUrl = config.services.jenkins.baseUrl;
const username = config.services.jenkins.username;
const apiToken = config.services.jenkins.apiToken;

// Output shape expected by Be Informed
interface BIJenkinsBuild {
  repo: string;
  branch: string;
  lastbuilddate: string; // yyyy-MM-dd
  lastbuildtime: string; // HH:mm:ss
  status?: string;
  jenkinsurl: string;
  environment: string;
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

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
  status?: string;
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

// Extract the branch name (e.g., trunk) from a Jenkins API path like
// /job/AIA_MTS/job/AIA_MTS-D/job/trunk/984/api/json
function extractBranchFromApiPath(p: string): string {
  try {
    const parts = p.split('/').filter(Boolean);
    // Collect job names in sequence after '/job/' markers
    const jobs: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'job' && i + 1 < parts.length) {
        jobs.push(decodeURIComponent(parts[i + 1]));
        i++;
      }
    }
    // The branch is typically the last job name before the build number
    // e.g., [AIA_MTS, AIA_MTS-D, trunk] → branch = 'trunk'
    if (jobs.length >= 3) return jobs[jobs.length - 1];
    if (jobs.length >= 2) return jobs[jobs.length - 1];
    return jobs[jobs.length - 1] || '';
  } catch {
    return '';
  }
}

// Fetch the list of jobs under a top-level repository (e.g., AIA_MBS)
function getBranches(repoName: string): Promise<JenkinsJob[]> {
  return new Promise((resolve) => {
    const encodedRepoName: string = encodeJobPath(repoName);
    const u = new URL(jenkinsBaseUrl);
    const isHttps = u.protocol === 'https:';
    const client = isHttps ? https : http;
    const options: http.RequestOptions = {
      hostname: u.hostname,
      port: u.port ? Number(u.port) : undefined,
      path: `/job/${encodedRepoName}/api/json`,
      method: 'GET',
      auth: `${username}:${apiToken}`
    };

    const req: http.ClientRequest = client.request(options, (res: http.IncomingMessage) => {
      let data: string = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          logger.warn(`Jenkins getBranches non-200: ${res.statusCode} for /job/${encodedRepoName}/api/json`);
          return resolve([]);
        }
        try {
          const jobInfo: { jobs?: JenkinsJob[] } = JSON.parse(data);
          resolve(jobInfo.jobs || []);
        } catch (e) {
          logger.warn(`Jenkins getBranches JSON parse error for /job/${encodedRepoName}/api/json`);
          resolve([]);
        }
      });

      res.on('error', (err) => {
        logger.warn(`Jenkins getBranches response error: ${String(err)}`);
        resolve([]);
      });
    });

    req.on('error', (err) => {
      logger.warn(`Jenkins getBranches request error: ${String(err)}`);
      resolve([]);
    });

    req.end();
  });
}

// Fetch the last build for a branch (job) by following redirects (kept for fallback)
async function getLastBuild(branchPath: string): Promise<BuildInfo | null> {
  return new Promise((resolve) => {
    const encodedBranchPath: string = getEncodedBranchPath(branchPath);
    const baseUrl = new URL(jenkinsBaseUrl);

    const doRequest = (host: string, port: number | undefined, useHttps: boolean, path: string, depth: number) => {
      if (depth > 5) {
        logger.warn(`Jenkins getLastBuild redirect limit exceeded for ${path}`);
        return resolve(null);
      }

      const client = useHttps ? https : http;
      const options: http.RequestOptions = {
        hostname: host,
        port,
        path,
        method: 'GET',
        auth: `${username}:${apiToken}`
      };

      const req: http.ClientRequest = client.request(options, (res: http.IncomingMessage) => {
        let data: string = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          // Handle redirects (Jenkins often 302s lastBuild to specific build)
          if (res.statusCode && [301,302,303,307,308].includes(res.statusCode)) {
            const loc = res.headers.location;
            if (!loc) {
              logger.warn(`Jenkins getLastBuild redirect without Location header for ${options.path}`);
              return resolve(null);
            }
            try {
              if (loc.startsWith('http://') || loc.startsWith('https://')) {
                const lu = new URL(loc);
                const hasApi = lu.pathname.includes('/api/');
                const nextPath = hasApi
                  ? (lu.pathname.endsWith('/api/json') ? lu.pathname : `${lu.pathname.replace(/\/api\/?$/, '/api/json')}`)
                  : `${lu.pathname.replace(/\/$/, '')}/api/json`;
                return doRequest(lu.hostname, lu.port ? Number(lu.port) : undefined, lu.protocol === 'https:', nextPath, depth + 1);
              } else {
                const hasApi = loc.includes('/api/');
                const nextPath = hasApi
                  ? (loc.endsWith('/api/json') ? loc : `${loc.replace(/\/api\/?$/, '/api/json')}`)
                  : `${loc.replace(/\/$/, '')}/api/json`;
                return doRequest(host, port, useHttps, nextPath, depth + 1);
              }
            } catch (e) {
              logger.warn(`Jenkins getLastBuild redirect handling error for ${options.path}`);
              return resolve(null);
            }
          }

          if (res.statusCode !== 200) {
            logger.warn(`Jenkins getLastBuild non-200: ${res.statusCode} for ${options.path}`);
            return resolve(null);
          }
          try {
            const buildInfo: { number: number, url: string, timestamp: number, result?: string } = JSON.parse(data);
            // Derive actual branch (e.g., trunk) from the resolved path
            const resolvedBranch = extractBranchFromApiPath(options.path || '') || branchPath.split('/').slice(1).join('/');
            return resolve({
              repository: branchPath.split('/')[0],
              branch: resolvedBranch,
              buildNumber: buildInfo.number,
              buildUrl: buildInfo.url,
              timestamp: buildInfo.timestamp,
              status: buildInfo.result
            });
          } catch (e) {
            logger.warn(`Jenkins getLastBuild JSON parse error for ${options.path}`);
            return resolve(null);
          }
        });

        res.on('error', (err) => {
          logger.warn(`Jenkins getLastBuild response error: ${String(err)}`);
          return resolve(null);
        });
      });

      req.on('error', (err) => {
        logger.warn(`Jenkins getLastBuild request error: ${String(err)}`);
        return resolve(null);
      });

      req.end();
    };

    // Jenkins expects '/job/' between each path segment (e.g., repo/job/branch)
    const initialPath = `/job/${encodedBranchPath.split('/').join('/job/')}/lastBuild/api/json`;
    const isHttps = baseUrl.protocol === 'https:';
    const port = baseUrl.port ? Number(baseUrl.port) : undefined;
    doRequest(baseUrl.hostname, port, isHttps, initialPath, 0);
  });
}

// List branches under a multibranch job: /job/<repo>/job/<multi>/api/json
async function getInnerBranches(repoName: string, multiJobName: string): Promise<JenkinsJob[]> {
  return new Promise((resolve) => {
    const u = new URL(jenkinsBaseUrl);
    const isHttps = u.protocol === 'https:';
    const client = isHttps ? https : http;
    const repo = encodeJobPath(repoName);
    const multi = encodeJobPath(multiJobName);
    const options: http.RequestOptions = {
      hostname: u.hostname,
      port: u.port ? Number(u.port) : undefined,
      path: `/job/${repo}/job/${multi}/api/json`,
      method: 'GET',
      auth: `${username}:${apiToken}`
    };

    const req: http.ClientRequest = client.request(options, (res: http.IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          logger.warn(`Jenkins getInnerBranches non-200: ${res.statusCode} for ${options.path}`);
          return resolve([]);
        }
        try {
          const jobInfo: { jobs?: JenkinsJob[] } = JSON.parse(data);
          resolve(jobInfo.jobs || []);
        } catch {
          logger.warn(`Jenkins getInnerBranches JSON parse error for ${options.path}`);
          resolve([]);
        }
      });
      res.on('error', (err) => {
        logger.warn(`Jenkins getInnerBranches response error: ${String(err)}`);
        resolve([]);
      });
    });
    req.on('error', (err) => {
      logger.warn(`Jenkins getInnerBranches request error: ${String(err)}`);
      resolve([]);
    });
    req.end();
  });
}

// Directly fetch lastBuild for a specific branch under a multibranch job (no redirects)
async function getBranchLastBuildDirect(repoName: string, multiJobName: string, branchName: string): Promise<BuildInfo | null> {
  return new Promise((resolve) => {
    const u = new URL(jenkinsBaseUrl);
    const isHttps = u.protocol === 'https:';
    const client = isHttps ? https : http;
    const repo = encodeJobPath(repoName);
    const multi = encodeJobPath(multiJobName);
    const branch = getEncodedBranchPath(branchName);
    const options: http.RequestOptions = {
      hostname: u.hostname,
      port: u.port ? Number(u.port) : undefined,
      path: `/job/${repo}/job/${multi}/job/${branch}/lastBuild/api/json`,
      method: 'GET',
      auth: `${username}:${apiToken}`
    };

    const req: http.ClientRequest = client.request(options, (res: http.IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          // Not all branches may have builds; be quiet here
          return resolve(null);
        }
        try {
          const buildInfo: { number: number, url: string, timestamp: number, result?: string } = JSON.parse(data);
          return resolve({
            repository: repoName,
            branch: branchName,
            buildNumber: buildInfo.number,
            buildUrl: buildInfo.url,
            timestamp: buildInfo.timestamp,
            status: buildInfo.result
          });
        } catch {
          return resolve(null);
        }
      });
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// Function to process each repository by enumerating multibranch jobs, then their branches
async function processRepository(repoName: string): Promise<BuildInfo[]> {
  const multiJobs: JenkinsJob[] = await getBranches(repoName);
  const excludedList = (process.env.JENKINS_EXCLUDED_JOBS || '_TASKS')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const excluded = new Set(excludedList);
  const filteredMultiJobs = multiJobs.filter(mj => !excluded.has(mj.name));
  logger.info(`Jenkins: repo ${repoName} has ${multiJobs.length} multibranch jobs (${filteredMultiJobs.length} after exclude)`);

  const perMultiPromises = filteredMultiJobs.map(async (mj) => {
    const branches = await getInnerBranches(repoName, mj.name);
    logger.info(`Jenkins: ${repoName}/${mj.name} has ${branches.length} branches`);
    const buildPromises = branches.map(b => getBranchLastBuildDirect(repoName, mj.name, b.name));
    const builds = await Promise.all(buildPromises);
    return builds.filter((x): x is BuildInfo => x !== null);
  });

  const nestedBuilds = await Promise.all(perMultiPromises);
  return nestedBuilds.flat();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.info('Jenkins Builds Request received');
  
  try {
    const envList = (process.env.JENKINS_ROOT_JOBS || '').split(',').map(s => s.trim()).filter(Boolean);
    const repositories: string[] = envList.length > 0 ? envList : [
      'AIA_MBS',
      'AIA_MTS'
    ];

    logger.info(`Fetching Jenkins builds for ${repositories.length} repositories`);
    
    const allBuildsPromises: Promise<BuildInfo[]>[] = repositories.map(processRepository);
    const allBuilds: BuildInfo[][] = await Promise.all(allBuildsPromises);
    
    const flattenedBuilds = allBuilds.flat();
    logger.info(`Successfully fetched ${flattenedBuilds.length} Jenkins builds`);

    // Map to Be Informed schema
    const envName = config.environment || 'development';
    const mapped: BIJenkinsBuild[] = flattenedBuilds.map(b => {
      const d = new Date(b.timestamp);
      return {
        repo: b.repository,
        branch: b.branch,
        lastbuilddate: formatDate(d),
        lastbuildtime: formatTime(d),
        status: b.status,
        jenkinsurl: b.buildUrl,
        environment: envName
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    logger.error('Failed to fetch Jenkins builds', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Failed to fetch Jenkins builds' }, { status: 500 });
  }
}
