import { expect, it } from 'vitest';
import { normalizeMoneyInput } from './moneyNormalization';

it('normalizes money input values', () => {
  expect(normalizeMoneyInput('125.50')).toBe(125.5);
  expect(normalizeMoneyInput(undefined)).toBe(0);
});
