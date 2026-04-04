#!/usr/bin/env node
import process from 'node:process';

const DEFAULT_PROJECTS = ['rentrix', 'rentrix-egy', 'rentrixxx'];
const REQUIRED_ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const API_BASE = 'https://api.vercel.com';

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.findIndex((entry) => entry === `--${name}`);
  if (index === -1) return '';
  return args[index + 1] ?? '';
};

const token = readArg('token') || process.env.VERCEL_TOKEN || '';
const teamId = readArg('team') || process.env.VERCEL_TEAM_ID || '';
const projectsArg = readArg('projects');
const projects = (projectsArg ? projectsArg.split(',') : DEFAULT_PROJECTS)
  .map((item) => item.trim())
  .filter(Boolean);

if (!token) {
  console.error('❌ Missing Vercel token. Use --token <token> or set VERCEL_TOKEN.');
  process.exit(1);
}

const withTeam = (url) => (teamId ? `${url}${url.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}` : url);

const fetchJson = async (path) => {
  const response = await fetch(withTeam(`${API_BASE}${path}`), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) ${path}: ${body}`);
  }

  return response.json();
};

const toIso = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const hasRequiredEnv = (env = []) => {
  const keys = new Set(env.map((item) => item.key));
  return REQUIRED_ENV_KEYS.filter((key) => keys.has(key));
};

const scoreProject = (row) => {
  let score = 0;
  if (row.latestDeployment?.state === 'READY') score += 4;
  if (row.requiredEnvCount === REQUIRED_ENV_KEYS.length) score += 3;
  if (row.latestDeployment?.target === 'production') score += 2;
  if (row.latestDeployment?.meta?.githubCommitSha) score += 1;
  return score;
};

const auditProject = async (projectName) => {
  const project = await fetchJson(`/v9/projects/${encodeURIComponent(projectName)}`);
  const deploymentsRes = await fetchJson(`/v6/deployments?projectId=${encodeURIComponent(project.id)}&limit=20`);
  const envRes = await fetchJson(`/v10/projects/${encodeURIComponent(project.id)}/env?decrypt=false`);

  const deployments = deploymentsRes.deployments || [];
  const latest = deployments[0] || null;
  const prodDeployments = deployments.filter((item) => item.target === 'production');
  const latestProd = prodDeployments[0] || null;
  const readyCount = deployments.filter((item) => item.state === 'READY').length;
  const failedCount = deployments.filter((item) => item.state === 'ERROR').length;

  const env = envRes.envs || [];
  const requiredFound = hasRequiredEnv(env);

  return {
    projectName,
    projectId: project.id,
    updatedAt: toIso(project.updatedAt),
    latestDeployment: latest
      ? {
          id: latest.uid,
          state: latest.state,
          createdAt: toIso(latest.createdAt),
          readyAt: toIso(latest.ready),
          target: latest.target || 'preview',
          url: latest.url,
          meta: latest.meta || {},
        }
      : null,
    latestProductionDeployment: latestProd
      ? {
          id: latestProd.uid,
          state: latestProd.state,
          createdAt: toIso(latestProd.createdAt),
          readyAt: toIso(latestProd.ready),
          target: latestProd.target || 'preview',
          url: latestProd.url,
          meta: latestProd.meta || {},
        }
      : null,
    deployments: {
      total: deployments.length,
      ready: readyCount,
      failed: failedCount,
    },
    envCount: env.length,
    requiredEnvFound: requiredFound,
    requiredEnvCount: requiredFound.length,
  };
};

const rows = [];
for (const projectName of projects) {
  try {
    rows.push(await auditProject(projectName));
  } catch (error) {
    rows.push({
      projectName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const validRows = rows.filter((item) => !item.error);
for (const row of validRows) {
  row.score = scoreProject(row);
}

validRows.sort((a, b) => b.score - a.score);

const recommendation = validRows[0] || null;

console.log(JSON.stringify({
  auditedAt: new Date().toISOString(),
  requiredEnvKeys: REQUIRED_ENV_KEYS,
  projects: rows,
  recommendation: recommendation
    ? {
        keepProject: recommendation.projectName,
        reason: 'Highest readiness score based on deployment state, production activity, and required env coverage.',
      }
    : null,
}, null, 2));
