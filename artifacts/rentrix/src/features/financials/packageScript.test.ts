import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('financials package test script', () => {
  it('runs all current-app financial tests through the scoped financials test directory', async () => {
    const packageJsonPath = resolve(import.meta.dirname, '../../../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.test).toBe('vitest run --config vite.config.ts --dir src/features/financials');
  });
});
