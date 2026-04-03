import test from 'node:test';
import assert from 'node:assert/strict';
import { calcVAT, distributeAmount } from '../../src/services/financeService';

test('calcVAT returns rounded VAT and gross values', () => {
  assert.deepEqual(calcVAT(100, 15), { net: 100, vat: 15, gross: 115 });
});

test('distributeAmount preserves exact total with largest-remainder handling', () => {
  const distribution = distributeAmount(100, [0.333, 0.333, 0.334]);
  assert.deepEqual(distribution, [33.3, 33.3, 33.4]);
  const total = distribution.reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
});
