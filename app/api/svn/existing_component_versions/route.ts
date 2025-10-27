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

function isValidVersion(version: string): boolean {
  return /^[0-9.]+(_[0-9.]+)?$/.test(version);
}

function fetchRevisionDate(path: string): Promise<Date | null> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: svn_url,
      port: 443,
      path: path,
      method: "PROPFIND",
      headers: {
        "User-Agent": "Node.js",
        Authorization: auth,
        "Content-Type": "text/xml",
        Depth: "0",
      },
    };

    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <getlastmodified/>
  </prop>
</propfind>`;

    const req = https.request(options, (resSvn) => {
      let data = "";

      resSvn.on("data", (chunk) => {
        data += chunk;
      });

      resSvn.on("end", () => {
        if (resSvn.statusCode !== 207) {
          return resolve(null);
        }

        parseString(
          data,
          { explicitArray: false },
          (err, result) => {
            if (err) {
              return resolve(null);
            }

            try {
              const lastModified = result?.['D:multistatus']?.['D:response']?.['D:propstat']?.['D:prop']?.['D:getlastmodified'];
              if (lastModified) {
                resolve(new Date(lastModified));
              } else {
                resolve(null);
              }
            } catch (e) {
              resolve(null);
            }
          }
        );
      });
    });

    req.on("error", (e) => {
      resolve(null);
    });

    req.write(propfindBody);
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
  console.log(`SVN existing component versions API called for URLs: ${svnUrls.join(', ')}`);
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
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

    // Filter valid versions and trunk
    const validComponents = allComponents.filter(
      (item) => isValidVersion(item.version) || item.branchName === 'trunk'
    );

    // Fetch revision dates and filter by two-year threshold
    const componentsWithDates = await Promise.all(
      validComponents.map(async (item) => {
        const isTrunk = item.branchName === "trunk";
        const path = isTrunk
          ? `${item.baseUrl}/${encodeURIComponent(item.componentName)}/trunk/`
          : `${item.baseUrl}/${encodeURIComponent(item.componentName)}/${item.branchName}/${item.version}/`;
        
        const revisionDate = await fetchRevisionDate(path);
        
        return {
          item,
          path,
          revisionDate,
          isTrunk,
        };
      })
    );

    // Filter: keep trunk or versions from last 2 years
    const recentComponents = componentsWithDates.filter((comp) => {
      if (comp.isTrunk) return true;
      if (!comp.revisionDate) return false;
      return comp.revisionDate >= twoYearsAgo;
    });

    const transformedComponents = recentComponents.map((comp) => ({
      url: `${svn_protocol}${svn_url}${comp.path}`,
    }));

    console.log(`Filtered ${transformedComponents.length} components from last 2 years (out of ${validComponents.length} total)`);

    return NextResponse.json({ response: transformedComponents });
  } catch (err) {
    console.error("Error fetching component versions:", err);
    return NextResponse.json(
      { error: "Failed to fetch component versions" },
      { status: 500 }
    );
  }
}
