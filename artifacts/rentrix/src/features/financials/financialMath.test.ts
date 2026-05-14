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

  it('never returns a negative remaining amount', () => {
    expect(getSafeRemainingAmount(100, 40)).toBe(60);
    expect(getSafeRemainingAmount(100, 150)).toBe(0);
    expect(getSafeRemainingAmount('bad', 10)).toBe(0);
  });

  it('sums only safe finite money values', () => {
    expect(sumFinancialValues([10, '5.5', null, Number.NaN, Number.POSITIVE_INFINITY])).toBe(15.5);
  });
});
