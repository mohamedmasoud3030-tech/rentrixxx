import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('financials package test script', () => {
  it('keeps the standard regression files and exposes an explicit financials suite', async () => {
    const packageJsonPath = resolve(import.meta.dirname, '../../../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };
    const standardSuite = packageJson.scripts?.test ?? '';

    expect(standardSuite).toContain('src/components/shared-state-semantics.test.tsx');
    expect(standardSuite).toContain('src/features/financials/receipts/receiptService.test.ts');
    expect(standardSuite).toContain('src/features/financials/payments/paymentService.test.ts');
    expect(standardSuite).toContain('src/features/financials/payments/usePayments.test.ts');
    expect(packageJson.scripts?.['test:financials']).toBe('vitest run --config vite.config.ts --dir src/features/financials');
  });
});
