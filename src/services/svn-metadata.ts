import { loadConfig, loadEnvironmentOverrides } from '@/src/config/loader';
import { parseString } from 'xml2js';

export type SvnResultKind = 'tag' | 'trunk' | 'branch';

export interface SvnResultOk {
  url: string;
  status: 'ok';
  kind: SvnResultKind;
  name: string;
  revision: string;
  author: string;
  date_modified: string;
}

export interface SvnResultError {
  url: string;
  status: 'error';
  error: string;
}

export type SvnResult = SvnResultOk | SvnResultError;

const baseConfig = loadConfig();
const config = loadEnvironmentOverrides(baseConfig);

const svnUsername = config.services.svn.username;
const svnPassword = config.services.svn.password;
const authHeader = `Basic ${Buffer.from(`${svnUsername}:${svnPassword}`).toString('base64')}`;

const propfindBody = `<?xml version="1.0" encoding="utf-8"?>\n<propfind xmlns="DAV:" xmlns:S="http://subversion.tigris.org/xmlns/svn/" xmlns:V="http://subversion.tigris.org/xmlns/dav/">\n  <prop>\n    <resourcetype xmlns="DAV:" />\n    <getcontentlength xmlns="DAV:" />\n    <version-name xmlns="DAV:" />\n    <creator-displayname xmlns="DAV:" />\n    <creationdate xmlns="DAV:" />\n    <checked-in xmlns="DAV:" />\n    <S:mime-type />\n    <S:externals />\n    <V:revision />\n  </prop>\n</propfind>`;

function isTagsUrl(url: string): boolean {
  return /\/tags\/?$/i.test(url);
}

function isTrunkUrl(url: string): boolean {
  return /\/trunk\/?$/i.test(url);
}

function isBranchUrl(url: string): boolean {
  return /\/branches\//i.test(url);
}

function getBranchNameFromUrl(url: string): string {
  const cleaned = url.replace(/\/+$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || '';
}

function getFolderNameFromHref(href: string): string {
  try {
    const urlObj = new URL(href, 'http://placeholder');
    const path = urlObj.pathname.replace(/\/+$/, '');
    const parts = path.split('/');
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch {
    const cleaned = href.replace(/\/+$/, '');
    const parts = cleaned.split('/');
    return decodeURIComponent(parts[parts.length - 1] || '');
  }
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getFirstProp(obj: any, keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0] !== undefined && value[0] !== null) {
          return String(value[0]);
        }
      } else {
        return String(value);
      }
    }
  }
  return undefined;
}

async function fetchSingle(url: string): Promise<SvnResult[]> {
  try {
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        Depth: '1',
        Authorization: authHeader,
        'Content-Type': 'text/xml',
      },
      body: propfindBody,
    });

    if (!response.ok && response.status !== 207) {
      return [
        {
          url,
          status: 'error',
          error: `HTTP ${response.status}`,
        },
      ];
    }

    const xmlText = await response.text();

    const parsed: any = await new Promise((resolve, reject) => {
      parseString(
        xmlText,
        { explicitArray: false, ignoreAttrs: false },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const multistatus =
      parsed?.['D:multistatus'] ||
      parsed?.multistatus ||
      parsed?.['d:multistatus'];

    if (!multistatus) {
      return [
        {
          url,
          status: 'error',
          error: 'Invalid PROPFIND response: missing multistatus',
        },
      ];
    }

    let responses = multistatus['D:response'] || multistatus['d:response'] || multistatus.response;
    responses = toArray(responses);

    if (!responses.length) {
      return [
        {
          url,
          status: 'error',
          error: 'Empty PROPFIND response',
        },
      ];
    }

    if (isTagsUrl(url)) {
      const results: SvnResult[] = [];

      for (const resp of responses) {
        const href = resp['D:href'] || resp['d:href'] || resp.href;
        if (!href) continue;

        const folderName = getFolderNameFromHref(href);
        if (!folderName || folderName.toLowerCase() === 'tags') {
          continue;
        }

        const propstat = toArray(resp['D:propstat'] || resp['d:propstat'] || resp.propstat)[0];
        const prop = propstat?.['D:prop'] || propstat?.['d:prop'] || propstat?.prop;

        const revision =
          getFirstProp(prop, ['D:version-name', 'version-name', 'lp1:version-name']) || '';
        const author =
          getFirstProp(prop, ['D:creator-displayname', 'creator-displayname', 'lp1:creator-displayname']) || '';
        const creationRaw =
          getFirstProp(prop, ['D:creationdate', 'creationdate', 'lp1:creationdate']) || '';

        let dateModified = creationRaw;
        if (creationRaw) {
          const d = new Date(creationRaw);
          if (!isNaN(d.getTime())) {
            dateModified = d.toISOString();
          }
        }

        results.push({
          url,
          status: 'ok',
          kind: 'tag',
          name: folderName,
          revision,
          author,
          date_modified: dateModified,
        });
      }

      if (!results.length) {
        return [
          {
            url,
            status: 'error',
            error: 'No tag entries found in PROPFIND response',
          },
        ];
      }

      return results;
    }

    const firstResponse = responses[0];
    const href = firstResponse['D:href'] || firstResponse['d:href'] || firstResponse.href;

    const propstat = toArray(
      firstResponse['D:propstat'] || firstResponse['d:propstat'] || firstResponse.propstat,
    )[0];
    const prop = propstat?.['D:prop'] || propstat?.['d:prop'] || propstat?.prop;

    const revision =
      getFirstProp(prop, ['D:version-name', 'version-name', 'lp1:version-name']) || '';
    const author =
      getFirstProp(prop, ['D:creator-displayname', 'creator-displayname', 'lp1:creator-displayname']) || '';
    const creationRaw =
      getFirstProp(prop, ['D:creationdate', 'creationdate', 'lp1:creationdate']) || '';

    let dateModified = creationRaw;
    if (creationRaw) {
      const d = new Date(creationRaw);
      if (!isNaN(d.getTime())) {
        dateModified = d.toISOString();
      }
    }

    let kind: SvnResultKind = 'branch';
    let name = '';

    if (isTrunkUrl(url)) {
      kind = 'trunk';
      name = 'trunk';
    } else if (isBranchUrl(url)) {
      kind = 'branch';
      name = getBranchNameFromUrl(url);
    } else {
      kind = 'branch';
      name = href ? getFolderNameFromHref(href) : getBranchNameFromUrl(url);
    }

    const okResult: SvnResultOk = {
      url,
      status: 'ok',
      kind,
      name,
      revision,
      author,
      date_modified: dateModified,
    };

    return [okResult];
  } catch (error) {
    return [
      {
        url,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    ];
  }
}

export async function fetchSvnMetadata(urls: string[]): Promise<SvnResult[]> {
  const results: SvnResult[] = [];

  for (const url of urls) {
    if (!url) {
      results.push({
        url: '',
        status: 'error',
        error: 'Empty URL',
      });
      continue;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      results.push({
        url,
        status: 'error',
        error: 'Invalid URL',
      });
      continue;
    }

    const perUrlResults = await fetchSingle(trimmed);
    results.push(...perUrlResults);
  }

  return results;
}
