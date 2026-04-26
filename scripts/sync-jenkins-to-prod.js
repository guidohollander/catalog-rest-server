/**
 * One-shot script: fetches Jenkins builds from 192.168.10.159 (reachable from this Windows machine)
 * and writes them directly to the production DB (DCSCDBH02\DBS22).
 * Run with: node scripts/sync-jenkins-to-prod.js
 */

const http = require('http');
const sql = require('mssql');

const JENKINS_BASE = 'http://192.168.10.159';
const JENKINS_USER = 'ext-guido.hollander';
const JENKINS_TOKEN = '1135d6d882458540f77241de349fbfcbdb';
const REPOS = ['AIA_MBS', 'AIA_MTS', 'GD_MBS', 'GD_MTS', 'SKN_MTS'];
const EXCLUDED = new Set(['_TASKS']);

const DB_CONFIG = {
  server: '192.168.10.52',
  port: 18022,
  database: 'SERVICECATALOG-D',
  user: 'guido.hollander',
  password: '1ZPwe7JvDqaFM8huvUOy',
  options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 }
};

function jenkinsGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '192.168.10.159',
      port: 80,
      path,
      method: 'GET',
      auth: `${JENKINS_USER}:${JENKINS_TOKEN}`,
      headers: { 'Accept': 'application/json' }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function pad2(n) { return n < 10 ? `0${n}` : String(n); }
function fmtDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function fmtTime(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }

function encodeBranch(name) {
  // Jenkins encodes slashes in branch names as %2F
  return name.split('/').map(encodeURIComponent).join('%2F');
}

async function getBranchLastBuild(repo, multiJob, branchName) {
  const branch = encodeBranch(branchName);
  const info = await jenkinsGet(`/job/${repo}/job/${multiJob}/job/${branch}/lastBuild/api/json`);
  if (!info) return null;
  const d = new Date(info.timestamp);
  // Decode URL-encoded branch names so they match SVN URLs (branches/x.y.z not branches%2Fx.y.z)
  const decodedBranch = decodeURIComponent(branchName);
  return {
    repo: repo.toLowerCase(),
    branch: decodedBranch,
    lastbuilddate: fmtDate(d),
    lastbuildtime: fmtTime(d),
    status: info.result || null,
    jenkinsurl: info.url,
    environment: 'production',
    deleted: 0
  };
}

async function processRepo(repo) {
  console.log(`Processing ${repo}...`);
  const repoInfo = await jenkinsGet(`/job/${repo}/api/json?tree=jobs[name,url]`);
  if (!repoInfo || !repoInfo.jobs) { console.log(`  No jobs for ${repo}`); return []; }

  const multiJobs = repoInfo.jobs.filter(j => !EXCLUDED.has(j.name));
  console.log(`  ${multiJobs.length} multibranch jobs`);

  // Parallel: for each multibranch job, get its branches, then parallel-fetch last build per branch
  const perMultiPromises = multiJobs.map(async mj => {
    const mjInfo = await jenkinsGet(`/job/${repo}/job/${mj.name}/api/json?tree=jobs[name,url]`);
    if (!mjInfo || !mjInfo.jobs) return [];
    const branches = mjInfo.jobs;
    console.log(`    ${mj.name}: ${branches.length} branches`);
    const buildPromises = branches.map(b => getBranchLastBuild(repo, mj.name, b.name));
    const builds = await Promise.all(buildPromises);
    return builds.filter(b => b !== null);
  });

  const nested = await Promise.all(perMultiPromises);
  const results = nested.flat();
  console.log(`  -> ${results.length} builds fetched`);
  return results;
}

async function main() {
  console.log('=== Jenkins → Production DB Sync ===\n');

  // Fetch all builds in parallel across repos
  const allBuilds = (await Promise.all(REPOS.map(processRepo))).flat();
  console.log(`\nTotal builds fetched: ${allBuilds.length}`);

  if (allBuilds.length === 0) {
    console.log('No builds found - aborting DB write');
    process.exit(1);
  }

  // Deduplicate: keep most recent build per (repo, branch)
  const dedupMap = new Map();
  for (const b of allBuilds) {
    const key = `${b.repo}|${b.branch}`;
    const existing = dedupMap.get(key);
    if (!existing || b.lastbuilddate > existing.lastbuilddate || (b.lastbuilddate === existing.lastbuilddate && b.lastbuildtime > existing.lastbuildtime)) {
      dedupMap.set(key, b);
    }
  }
  const deduped = Array.from(dedupMap.values());
  console.log(`After dedup: ${deduped.length} unique (repo, branch) combinations`);

  // Write to production DB
  console.log('\nConnecting to production DB...');
  const pool = await sql.connect(DB_CONFIG);

  try {
    // Clear temp table
    await pool.request().query('TRUNCATE TABLE jenkins_deployment_temp');
    console.log('Cleared jenkins_deployment_temp');

    // Insert all builds (deduped)
    for (const b of deduped) {
      await pool.request()
        .input('repo', sql.NVarChar, b.repo)
        .input('branch', sql.NVarChar, b.branch)
        .input('lastbuilddate', sql.NVarChar, b.lastbuilddate)
        .input('lastbuildtime', sql.NVarChar, b.lastbuildtime)
        .input('status', sql.NVarChar, b.status)
        .input('jenkinsurl', sql.NVarChar, b.jenkinsurl)
        .input('environment', sql.NVarChar, b.environment)
        .input('deleted', sql.Int, b.deleted)
        .query(`INSERT INTO jenkins_deployment_temp (repo,branch,lastbuilddate,lastbuildtime,status,jenkinsurl,environment,deleted)
                VALUES (@repo,@branch,@lastbuilddate,@lastbuildtime,@status,@jenkinsurl,@environment,@deleted)`);
    }
    console.log(`Inserted ${deduped.length} rows into jenkins_deployment_temp`);

    // Run merge
    const mergeResult = await pool.request().query('EXEC mergeJenkinsDeployment');
    const r = mergeResult.recordset[0];
    console.log(`Merge result: inserted=${r.InsertedCount} updated=${r.UpdatedCount} deleted=${r.DeletedCount}`);

    // Materialize view
    await pool.request().query(`EXEC usp_materialize_view_where 'vw_jenkins_deployment', '1=1'`);
    console.log('Materialized mvw_jenkins_deployment');

    // Verify
    const verify = await pool.request().query('SELECT COUNT(*) as cnt FROM jenkins_deployment');
    console.log(`\njenkings_deployment now has ${verify.recordset[0].cnt} rows`);

    const sample = await pool.request().query('SELECT TOP 5 repo, branch, status, lastbuilddate FROM jenkins_deployment ORDER BY lastbuilddate DESC');
    console.log('\nSample rows:');
    sample.recordset.forEach(r => console.log(`  ${r.repo}/${r.branch} -> ${r.status} @ ${r.lastbuilddate}`));

  } finally {
    await pool.close();
  }

  console.log('\nDone!');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
