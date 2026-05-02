#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = 'https://github.com/anthropics/skills.git';
const ref = process.env.ANTHROPIC_SKILLS_REF || 'main';
const sourcePath = process.env.ANTHROPIC_SKILLS_PATH || 'skills';
const destination = resolve(process.cwd(), 'skills/external/anthropics');
const tempDir = resolve(process.cwd(), '.tmp/anthropics-skills');

const run = (command, cwd = process.cwd()) => {
  execSync(command, { cwd, stdio: 'inherit' });
};

const copyTree = (src, dest) => {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  run(`cp -R \"${src}/.\" \"${dest}\"`);
};

try {
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  run('git init', tempDir);
  run(`git remote add origin ${repo}`, tempDir);
  run('git config core.sparseCheckout true', tempDir);

  const sparseCheckoutFile = resolve(tempDir, '.git/info/sparse-checkout');
  run(`bash -lc 'printf "%s\\n" "${sourcePath}" > "${sparseCheckoutFile}"'`, tempDir);

  run(`git pull --depth 1 origin ${ref}`, tempDir);

  const sourceDirectory = resolve(tempDir, sourcePath);
  if (!existsSync(sourceDirectory)) {
    throw new Error(`Path not found in remote repo: ${sourcePath}`);
  }

  copyTree(sourceDirectory, destination);

  console.log('\n✅ Anthropic skills imported successfully.');
  console.log(`   Source: ${repo} (${ref}:${sourcePath})`);
  console.log(`   Destination: ${destination}`);
} catch (error) {
  console.error('\n❌ Failed to import Anthropic skills.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
