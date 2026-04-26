export function normalizeExternalsForCatalog(rawExternals: string): string {
  return rawExternals
    .replace(/'/g, '"')
    .replace(/\^/g, '/svn/SOLUTIONCOMPONENTS');
}

export function parseComponentVersionIdentity(fromUrl: string): {
  componentNameFrom: string;
  componentVersionFrom: string;
} {
  const segments = fromUrl.replace(/\/+$/, '').split('/').filter(Boolean);
  const trunkIndex = segments.lastIndexOf('trunk');
  if (trunkIndex > 0 && trunkIndex === segments.length - 1) {
    return {
      componentNameFrom: decodeURIComponent(segments[trunkIndex - 1] || ''),
      componentVersionFrom: 'trunk',
    };
  }

  const branchIndex = segments.lastIndexOf('branches');
  if (branchIndex > 0 && branchIndex < segments.length - 1) {
    return {
      componentNameFrom: decodeURIComponent(segments[branchIndex - 1] || ''),
      componentVersionFrom: `branches/${decodeURIComponent(segments[branchIndex + 1] || '')}`,
    };
  }

  const tagIndex = segments.lastIndexOf('tags');
  if (tagIndex > 0 && tagIndex < segments.length - 1) {
    return {
      componentNameFrom: decodeURIComponent(segments[tagIndex - 1] || ''),
      componentVersionFrom: `tags/${decodeURIComponent(segments[tagIndex + 1] || '')}`,
    };
  }

  throw new Error(`Unsupported component version URL format: ${fromUrl}`);
}

export function buildPropgetCommand(fromUrl: string, svnUsername: string, svnPassword: string): string {
  return [
    'svn propget svn:externals',
    `"${fromUrl}"`,
    `--username "${svnUsername}"`,
    `--password "${svnPassword}"`,
    '--non-interactive',
    '--trust-server-cert',
  ].join(' ');
}
