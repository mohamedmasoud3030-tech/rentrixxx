#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

const allowedRoots = ['src/', 'tests/', 'scripts/'];
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const files = trackedFiles.filter((relativePath) => {
  if (!allowedRoots.some((root) => relativePath.startsWith(root))) return false;
  return [...allowedExtensions].some((ext) => relativePath.endsWith(ext));
});

const issues = [];
const conflictMarkers = [/^<<<<<<< /m, /^=======$/m, /^>>>>>>> /m];

for (const relativePath of files) {
  const fullPath = join(process.cwd(), relativePath);
  const content = readFileSync(fullPath, 'utf8');

  if (conflictMarkers.some((pattern) => pattern.test(content))) {
    issues.push(`${relativePath}: merge conflict markers detected`);
  }

}

if (issues.length > 0) {
  console.error('❌ Lint checks failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`✅ Lint checks passed for ${files.length} files.`);
