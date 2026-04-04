#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const strict = process.argv.includes('--strict');
const warnings = [];
const errors = [];

const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'src/config/env.ts',
  '.github/workflows/ci.yml',
  '.env.example',
];

const placeholderPatterns = [/changeme/i, /your[_-]?/i, /^test$/i, /^placeholder$/i];
const requiredEnvNames = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {};

  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
};

const envFromFiles = {
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
};

const envFromExample = parseEnvFile('.env.example');

const readEnv = (name) => (process.env[name] ?? envFromFiles[name] ?? '').trim();
const isPlaceholder = (value) => !value || placeholderPatterns.some((pattern) => pattern.test(value));

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
  }
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
if (Number.isNaN(nodeMajor) || nodeMajor < 20) {
  errors.push(`Node.js 20+ is required, current version is ${process.versions.node}.`);
}

if (!existsSync('.env') && !existsSync('.env.local')) {
  warnings.push('No .env or .env.local file found. Deployment env validation is limited to process env + .env.example schema checks.');
}

for (const envName of requiredEnvNames) {
  if (!(envName in envFromExample)) {
    errors.push(`.env.example is missing required key: ${envName}`);
  }
}

const missingRequiredRuntimeEnv = [];

for (const envName of requiredEnvNames) {
  const value = readEnv(envName);

  if (!value) {
    missingRequiredRuntimeEnv.push(envName);
    continue;
  }

  if (isPlaceholder(value)) {
    errors.push(`Env variable ${envName} still uses a placeholder/test value.`);
  }
}

if (missingRequiredRuntimeEnv.length > 0) {
  const message = `Missing runtime env values: ${missingRequiredRuntimeEnv.join(', ')}. Configure these in Vercel Project Settings → Environment Variables before deployment.`;

  if (strict) {
    warnings.push(`${message} (strict mode keeps this as warning when local secrets are intentionally absent).`);
  } else {
    warnings.push(message);
  }
}

if (!existsSync('supabase/migrations') || readFileSync('package.json', 'utf8').length === 0) {
  warnings.push('Supabase migrations directory or package metadata could not be fully validated.');
}

const summary = [
  ['Strict mode', strict ? 'enabled' : 'disabled'],
  ['Node.js', process.versions.node],
  ['Env source', existsSync('.env.local') ? '.env.local' : existsSync('.env') ? '.env' : 'process env only'],
];

console.log('Deployment readiness summary:');
for (const [label, value] of summary) {
  console.log(`- ${label}: ${value}`);
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length > 0) {
  console.error('\nReadiness check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\nReadiness check passed${warnings.length > 0 ? ' with warnings' : ''}.`);
