import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('financials package test script', () => {
  it('keeps the existing package test command and exposes an explicit financials suite', async () => {
    const packageJsonPath = resolve(import.meta.dirname, '../../../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.test).toBe('vitest run --config vite.config.ts src/features/financials/receipts/receiptService.test.ts src/features/financials/payments/paymentService.test.ts src/features/financials/payments/usePayments.test.ts');
    expect(packageJson.scripts?.['test:financials']).toBe('vitest run --config vite.config.ts --dir src/features/financials');
  });
});
