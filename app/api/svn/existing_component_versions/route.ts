import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { parseString } from 'xml2js';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const svn_url = config.services.svn.baseUrl;
const svn_protocol = config.services.svn.protocol;
const auth = `Basic ${Buffer.from(`${config.services.svn.username}:${config.services.svn.password}`).toString('base64')}`;

const repositoryPaths = [
  "/svn/SOLUTIONCOMPONENTS/SolutionDevelopment",
  "/svn/MBS_ANGLO",
  "/svn/MTS_ANGLO",
];

const svnUrls = repositoryPaths.map(
  (path) => `${svn_protocol}${svn_url}${path}`
);

function fetchFolderContents(path: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: svn_url,
      port: 443,
      path: path,
      method: "GET",
      headers: {
        "User-Agent": "Node.js",
        Authorization: auth,
      },
    };

    const req = https.request(options, (resSvn) => {
      let data = "";

      resSvn.on("data", (chunk) => {
        data += chunk;
      });

      resSvn.on("end", () => {
        if (resSvn.statusCode === 404) {
          return resolve([]);
        }

        if (resSvn.statusCode !== 200) {
          console.error(
            `Failed to fetch ${path}: Status Code ${resSvn.statusCode}`
          );
          return reject(
            new Error(
              `Request failed with status code ${resSvn.statusCode}`
            )
          );
        }

        parseString(
          data,
          { explicitArray: false },
          (err, result) => {
            if (err) {
              console.error(`Error parsing XML for ${path}:`, err);
              return reject(err);
            }

            if (
              !result ||
              !result.svn ||
              !result.svn.index ||
              !result.svn.index.dir
            ) {
              console.warn(
                `Unexpected XML structure for ${path}, assuming no directories found.`
              );
              return resolve([]);
            }

            let dirs = result.svn.index.dir;
            if (!Array.isArray(dirs)) {
              dirs = [dirs];
            }

            const items = dirs.map(
              (dir: { $: { name: string } }) => dir.$.name
            );
            resolve(items);
          }
        );
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request to ${path}: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

function fetchAllVersions(
  repository: string,
  baseUrl: string
): Promise<any[]> {
  const encodedRepository = encodeURIComponent(repository);

  return Promise.all([
    fetchFolderContents(`${baseUrl}/${encodedRepository}/tags/`).then(
      (tags) =>
        tags.map((tag) => ({
          componentName: repository,
          branchName: "tags",
          version: tag,
          baseUrl,
        }))
    ),
    fetchFolderContents(`${baseUrl}/${encodedRepository}/branches/`).then(
      (branches) =>
        branches.map((branch) => ({
          componentName: repository,
          branchName: "branches",
          version: branch,
          baseUrl,
        }))
    ),
    fetchFolderContents(`${baseUrl}/${encodedRepository}/trunk/`).then(
      (trunk) =>
        trunk.length > 0
          ? [
              {
                componentName: repository,
                branchName: "trunk",
                version: "trunk",
                baseUrl,
              },
            ]
          : []
    ),
  ]).then((results) => results.flat());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let allComponents: any[] = [];

    for (const baseUrl of svnUrls) {
      const components = await fetchFolderContents(
        new URL(baseUrl).pathname + "/"
      );
      const componentVersionsPromises = components.map((component) =>
        fetchAllVersions(component, new URL(baseUrl).pathname)
      );

      const allVersions = await Promise.all(componentVersionsPromises);
      allComponents = allComponents.concat(allVersions.flat());
    }

    const transformedComponents = allComponents.map((item) => {
      const isTrunk = item.branchName === "trunk";
      return {
        url: isTrunk
          ? `${svn_protocol}${svn_url}${item.baseUrl}/${encodeURIComponent(
              item.componentName
            )}/trunk/`
          : `${svn_protocol}${svn_url}${item.baseUrl}/${encodeURIComponent(
              item.componentName
            )}/${item.branchName}/${item.version}/`,
      };
    });

    return NextResponse.json({ response: transformedComponents });
  } catch (err) {
    console.error("Error fetching component versions:", err);
    return NextResponse.json(
      { error: "Failed to fetch component versions" },
      { status: 500 }
    );
  }
}
