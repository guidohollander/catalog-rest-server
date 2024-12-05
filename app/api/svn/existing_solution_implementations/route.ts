import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { parseString } from 'xml2js';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_url = config.services.svn.baseUrl;
const svn_protocol = config.services.svn.protocol;
const auth = `Basic ${Buffer.from(`${config.services.svn.username}:${config.services.svn.password}`).toString('base64')}`;

const excludedFolders = ["SolutionDevelopment", "MBS_ANGLO", "MTS_ANGLO"];

function isValidVersion(version: string): boolean {
  return version !== 'trunk' && /^[0-9.]+$/.test(version);
}

function fetchFolderContents(path: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: svn_url,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js',
        'Authorization': auth
      }
    };

    const req = https.request(options, (resSvn) => {
      let data = '';

      resSvn.on('data', (chunk) => {
        data += chunk;
      });

      resSvn.on('end', () => {
        if (resSvn.statusCode === 404) {
          return resolve([]); // Resolve with an empty array for missing paths
        }

        if (resSvn.statusCode !== 200) {
          console.error(`Failed to fetch ${path}: Status Code ${resSvn.statusCode}`);
          return reject(
            new Error(`Request failed with status code ${resSvn.statusCode}`)
          );
        }

        parseString(data, { explicitArray: false }, (err, result) => {
          if (err) {
            console.error(`Error parsing XML for ${path}:`, err);
            return reject(err);
          }

          if (!result || !result.svn || !result.svn.index || !result.svn.index.dir) {
            console.warn(`Unexpected XML structure for ${path}, assuming no directories found.`);
            return resolve([]);
          }

          let dirs = result.svn.index.dir;
          if (!Array.isArray(dirs)) {
            dirs = [dirs]; // Ensure it's an array
          }

          const items = dirs.map(
            (dir: { $: { name: string } }) => dir.$.name
          );
          resolve(items);
        });
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request to ${path}: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

function fetchAllVersions(solutionImplementation: string): Promise<any[]> {
  const encodedSolution = encodeURIComponent(solutionImplementation);

  return Promise.all([
    fetchFolderContents(`/svn/${encodedSolution}/tags/`).then((tags) =>
      tags.map((tag) => ({
        solutionName: solutionImplementation,
        branchName: 'tags',
        version: tag
      }))
    ),
    fetchFolderContents(`/svn/${encodedSolution}/branches/`).then(
      (branches) =>
        branches.map((branch) => ({
          solutionName: solutionImplementation,
          branchName: 'branches',
          version: branch
        }))
    ),
    fetchFolderContents(`/svn/${encodedSolution}/trunk/`).then((trunk) =>
      trunk.length > 0
        ? [
            {
              solutionName: solutionImplementation,
              branchName: 'trunk',
              version: 'trunk'
            }
          ]
        : []
    )
  ]).then((results) => results.flat());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const allFolders = await fetchFolderContents('/svn/');
    const solutionImplementations = allFolders.filter(
      (folder) => !excludedFolders.includes(folder)
    );
    const allVersionsPromises = solutionImplementations.map((solution) =>
      fetchAllVersions(solution)
    );

    // Wait for all versions of solution implementations to be fetched
    const allVersions = await Promise.all(allVersionsPromises);

    // Flatten the results, filter for valid versions, and transform them into the desired format
    const transformedVersions = allVersions
      .flat()
      .filter((item) => isValidVersion(item.version)) // Filtering for valid versions
      .map((item) => {
        const isTrunk = item.branchName === 'trunk';
        return {
          url: isTrunk
            ? `${svn_protocol}${svn_url}/svn/${encodeURIComponent(
                item.solutionName
              )}/trunk/`
            : `${svn_protocol}${svn_url}/svn/${encodeURIComponent(
                item.solutionName
              )}/${item.branchName}/${item.version}/`
        };
      });

    return NextResponse.json({ response: transformedVersions });
  } catch (err) {
    console.error('Error fetching solution implementations:', err);
    return NextResponse.json(
      { error: 'Failed to fetch solution implementations' },
      { status: 500 }
    );
  }
}
