import { describe, expect, it } from 'vitest';
import { getSafeRemainingAmount, sumFinancialValues, toFinancialNumber } from './financialMath';

describe('financialMath', () => {
  it('coerces invalid, null, and infinite values to zero', () => {
    expect(toFinancialNumber(null)).toBe(0);
    expect(toFinancialNumber(undefined)).toBe(0);
    expect(toFinancialNumber('not-a-number')).toBe(0);
    expect(toFinancialNumber(Number.NaN)).toBe(0);
    expect(toFinancialNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toFinancialNumber('12.5')).toBe(12.5);
  });

  it('calculates remaining balances from the shared safe financial math contract', () => {
    expect(getSafeRemainingAmount(1000, 0)).toBe(1000);
    expect(getSafeRemainingAmount(1000, 300)).toBe(700);
    expect(getSafeRemainingAmount(1000, 1000)).toBe(0);
    expect(getSafeRemainingAmount(1000, 1200)).toBe(0);
    expect(getSafeRemainingAmount(null, 10)).toBe(0);
    expect(getSafeRemainingAmount('not-a-number', 10)).toBe(0);
    expect(getSafeRemainingAmount(1000, Number.POSITIVE_INFINITY)).toBe(1000);
  });

  it('sums only safe finite money values', () => {
    expect(sumFinancialValues([10, '5.5', null, Number.NaN, Number.POSITIVE_INFINITY])).toBe(15.5);
  });
});
