import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localBin = (name) => path.join(root, 'node_modules', '.bin', name);

const requiredBinaries = ['tsc', 'vite'];
const missingBinaries = requiredBinaries.filter((bin) => !fs.existsSync(localBin(bin)));

if (missingBinaries.length > 0) {
  const msg = `Missing required local binaries: ${missingBinaries.join(', ')}`;
  if (process.env.CI === 'true') {
    console.error(msg);
    console.error('Run `npm ci` to install exact locked dependencies before running CI scripts.');
    process.exit(1);
  }
  console.warn(`[preflight warning] ${msg}`);
}

const strictEnv = process.env.PREFLIGHT_STRICT_ENV === '1';
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  const message = `Missing environment variables: ${missingEnvVars.join(', ')}`;
  if (strictEnv) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`[preflight warning] ${message}`);
  console.warn('[preflight warning] Set PREFLIGHT_STRICT_ENV=1 to enforce hard failure.');
}

console.log('Preflight checks passed.');
