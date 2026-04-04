import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const tempTestsDir = join(process.cwd(), '.tmp-tests');

if (existsSync(tempTestsDir)) {
  rmSync(tempTestsDir, { recursive: true, force: true });
}

const tscEntry = join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');
const result = spawnSync(process.execPath, [tscEntry, '-p', 'tsconfig.tests.json'], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
