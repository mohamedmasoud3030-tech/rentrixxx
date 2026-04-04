#!/usr/bin/env node
import { existsSync } from 'node:fs';
import process from 'node:process';

const errors = [];

const requiredNodeMajor = 20;
const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < requiredNodeMajor) {
  errors.push(
    `Node.js ${requiredNodeMajor}+ is required, current version is ${process.versions.node}.`
  );
}

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'tsconfig.typecheck.json',
  'vite.config.ts',
];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
  }
}

if (errors.length > 0) {
  console.error('❌ Preflight checks failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('✅ Preflight checks passed.');
