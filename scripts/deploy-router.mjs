#!/usr/bin/env node
import { execSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_SHA || process.env.GITHUB_EVENT_BEFORE || 'HEAD~1';
const head = process.env.GITHUB_SHA || 'HEAD';

function getChangedFiles() {
  try {
    const output = execSync(`git diff --name-only ${base} ${head}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const changedFiles = getChangedFiles();
const deployVercel = changedFiles.some((file) => file.startsWith('artifacts/rentrix/'));
const deployCloudflare = changedFiles.some((file) => file.startsWith('artifacts/api-server/'));

console.log(`Changed files (${changedFiles.length}):`);
for (const file of changedFiles) {
  console.log(` - ${file}`);
}
console.log(`deploy_vercel=${deployVercel}`);
console.log(`deploy_cloudflare=${deployCloudflare}`);

if (process.env.GITHUB_OUTPUT) {
  const lines = [
    `deploy_vercel=${deployVercel}`,
    `deploy_cloudflare=${deployCloudflare}`,
    `changed_count=${changedFiles.length}`,
  ].join('\n');
  execSync(`printf '%s\n' "${lines}" >> "$GITHUB_OUTPUT"`, { shell: '/bin/bash' });
}
