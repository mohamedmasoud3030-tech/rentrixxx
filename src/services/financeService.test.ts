import { describe, expect, it } from 'vitest';
import {
  calcVAT,
  distributeAmount,
  computeLateFeeAmount,
  deriveArrearsForContract,
  deriveArrearsForOwner,
  applyBalanceRule,
  getPostedReceiptsForDate,
} from './financeService';
import type { Contract, Invoice, Settings } from '../types';

describe('financeService', () => {
  it('calculates VAT with 3-decimal rounding', () => {
    expect(calcVAT(100, 5)).toEqual({ net: 100, vat: 5, gross: 105 });
    expect(calcVAT(10.333, 15)).toEqual({ net: 10.333, vat: 1.55, gross: 11.883 });
  });

  it('distributes amount proportionally and preserves total', () => {
    const result = distributeAmount(100, [1, 1, 2]);
    expect(result).toEqual([25, 25, 50]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('computes late fee for fixed and percentage modes', () => {
    const fixed = { isEnabled: true, type: 'FIXED_AMOUNT', value: 12.345, graceDays: 3 } as Settings['operational']['lateFee'];
    const percent = { isEnabled: true, type: 'PERCENTAGE', value: 10, graceDays: 3 } as Settings['operational']['lateFee'];

    expect(computeLateFeeAmount(120, fixed)).toBe(12.345);
    expect(computeLateFeeAmount(120, percent)).toBe(12);
    expect(computeLateFeeAmount(120, { ...fixed, isEnabled: false })).toBe(0);
  });

  it('derives arrears for contract and owner', () => {
    const invoices = [
      { id: 'i1', contractId: 'c1', amount: 100, paidAmount: 40, status: 'PARTIALLY_PAID' },
      { id: 'i2', contractId: 'c2', amount: 200, paidAmount: 0, status: 'UNPAID' },
    ] as Invoice[];
    const contracts = [{ id: 'c1' }, { id: 'c2' }] as Contract[];

    expect(deriveArrearsForContract(invoices, 'c1')).toBe(60);
    expect(deriveArrearsForOwner(contracts, invoices, ['c2'])).toBe(200);
  });

  it('applies balance floor and filters posted receipts by date', () => {
    expect(applyBalanceRule(-3.333, 0)).toBe(0);
    expect(applyBalanceRule(10.12349, 0)).toBe(10.123);

    const receipts = [
      { id: 'r1', status: 'POSTED', dateTime: '2026-05-01T10:00:00.000Z', amount: 50 },
      { id: 'r2', status: 'DRAFT', dateTime: '2026-05-01T11:00:00.000Z', amount: 40 },
    ] as any;

    expect(getPostedReceiptsForDate(receipts, '2026-05-01')).toHaveLength(1);
  });
});
