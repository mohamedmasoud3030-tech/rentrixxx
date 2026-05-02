import { describe, it, expect } from 'vitest';
import { 
  toNumber, 
  round3, 
  calcVAT, 
  distributeAmount, 
  computeLateFeeAmount,
  applyBalanceRule
} from './financeService';

describe('FinanceService Utility Functions', () => {
  describe('toNumber', () => {
    it('should convert valid numbers correctly', () => {
      expect(toNumber(10)).toBe(10);
      expect(toNumber('10.5')).toBe(10.5);
    });

    it('should return 0 for invalid inputs', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber('abc')).toBe(0);
      expect(toNumber({})).toBe(0);
    });
  });

  describe('round3', () => {
    it('should round to 3 decimal places', () => {
      expect(round3(10.12345)).toBe(10.123);
      expect(round3(10.1235)).toBe(10.123); // .toFixed(3) for 10.1235 is "10.123" due to floating point representation
      expect(round3(10)).toBe(10);
    });
  });

  describe('calcVAT', () => {
    it('should calculate VAT correctly', () => {
      const result = calcVAT(100, 15);
      expect(result.net).toBe(100);
      expect(result.vat).toBe(15);
      expect(result.gross).toBe(115);
    });

    it('should handle decimal rates and amounts', () => {
      const result = calcVAT(100.5, 5.5);
      // 100.5 * 0.055 = 5.5275 -> rounded to 5.528
      expect(result.vat).toBe(5.528);
      expect(result.gross).toBe(106.028);
    });
  });

  describe('distributeAmount', () => {
    it('should distribute total amount proportionally among parts', () => {
      const parts = [100, 200];
      const total = 30;
      const distributed = distributeAmount(total, parts);
      expect(distributed).toEqual([10, 20]);
      expect(distributed.reduce((a, b) => a + b, 0)).toBe(total);
    });

    it('should handle remainders correctly by giving to the largest part/remainder', () => {
      const parts = [1, 1, 1];
      const total = 10;
      const distributed = distributeAmount(total, parts);
      // 10 / 3 = 3.3333...
      // Total units = 10000
      // Parts get 3333, 3333, 3333. Remainder 1 unit.
      // First part gets the extra unit.
      expect(distributed.reduce((a, b) => a + b, 0)).toBe(total);
      expect(distributed).toEqual([3.334, 3.333, 3.333]);
    });

    it('should return zeros for zero total or empty parts', () => {
      expect(distributeAmount(0, [1, 2])).toEqual([0, 0]);
      expect(distributeAmount(10, [])).toEqual([]);
    });
  });

  describe('computeLateFeeAmount', () => {
    const lateFeeFixed = { isEnabled: true, type: 'FIXED_AMOUNT' as const, value: 50, graceDays: 5 };
    const lateFeePercent = { isEnabled: true, type: 'PERCENTAGE_OF_RENT' as const, value: 10, graceDays: 5 };
    const lateFeeDisabled = { isEnabled: false, type: 'FIXED_AMOUNT' as const, value: 50, graceDays: 5 };

    it('should calculate fixed late fee', () => {
      expect(computeLateFeeAmount(1000, lateFeeFixed)).toBe(50);
    });

    it('should calculate percentage late fee', () => {
      expect(computeLateFeeAmount(1000, lateFeePercent)).toBe(100);
    });

    it('should return 0 if late fee is disabled', () => {
      expect(computeLateFeeAmount(1000, lateFeeDisabled)).toBe(0);
    });
  });

  describe('applyBalanceRule', () => {
    it('should apply minimum balance', () => {
      expect(applyBalanceRule(-10, 0)).toBe(0);
      expect(applyBalanceRule(10, 0)).toBe(10);
      expect(applyBalanceRule(-5, -2)).toBe(-2);
    });
  });
});
