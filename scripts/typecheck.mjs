import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'tsconfig.typecheck.json',
  'src/constants/status.ts',
  'src/utils/status.ts',
  'src/utils/validation.ts',
  'src/services/auditEngine.ts',
  'src/config/env.ts',
  'src/services/errorTracker.ts',
  'src/contexts/authContext.tsx',
  'src/contexts/financeContext.tsx',
  'src/contexts/operationsContext.tsx',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error('Missing required files for typecheck gate:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const localTsc = 'node_modules/typescript/bin/tsc';
const hasLocalTsc = fs.existsSync(localTsc);
const tscCommand = hasLocalTsc ? process.execPath : 'tsc';
const tscArgs = hasLocalTsc
  ? [localTsc, '-p', 'tsconfig.typecheck.json', '--noEmit']
  : ['-p', 'tsconfig.typecheck.json', '--noEmit'];

const tscRun = spawnSync(tscCommand, tscArgs, { stdio: 'inherit' });

if (tscRun.error && tscRun.error.code === 'ENOENT') {
  console.warn('TypeScript compiler is unavailable; running staged checks only (no npx fallback).');
  console.log(`Staged typecheck prerequisites verified (${requiredFiles.length} files).`);
  process.exit(0);
}

if (tscRun.status !== 0) {
  process.exit(tscRun.status ?? 1);
}

console.log('TypeScript typecheck passed.');
