import { describe, expect, it } from 'vitest';
import type { OverdueInvoiceReportRow } from '../reports/financialReportsService';
import {
  filterOverdueInvoiceRows,
  getArrearsBucketLabel,
  getBucketKeyFromDaysOverdue,
  safePercentage,
} from './arrears-workflow-helpers';

function createRow(overrides: Partial<OverdueInvoiceReportRow>): OverdueInvoiceReportRow {
  return {
    invoiceId: 'invoice_alpha_123456',
    shortInvoiceId: 'invoice_',
    contractId: 'contract_alpha_123456',
    tenantId: 'tenant_alpha',
    tenantName: 'أحمد علي',
    propertyId: 'property_alpha',
    propertyTitle: 'برج النخيل',
    unitId: 'unit_alpha',
    unitNumber: 'A-101',
    dueDate: '2026-04-01',
    daysOverdue: 15,
    amount: 1000,
    paidAmount: 200,
    remainingAmount: 800,
    status: 'partial',
    ...overrides,
  };
}

describe('arrears workflow helpers', () => {
  it('maps bucket labels and days overdue into stable Arabic workflow buckets', () => {
    expect(getArrearsBucketLabel('current')).toBe('حالي');
    expect(getArrearsBucketLabel('days_90_plus')).toBe('90+ يوم');
    expect(getBucketKeyFromDaysOverdue(-5)).toBe('current');
    expect(getBucketKeyFromDaysOverdue(Number.NaN)).toBe('current');
    expect(getBucketKeyFromDaysOverdue(30)).toBe('days_1_30');
    expect(getBucketKeyFromDaysOverdue(31)).toBe('days_31_60');
    expect(getBucketKeyFromDaysOverdue(61)).toBe('days_61_90');
    expect(getBucketKeyFromDaysOverdue(91)).toBe('days_90_plus');
  });

  it('calculates safe percentages without NaN or Infinity output', () => {
    expect(safePercentage(25, 100)).toBe(25);
    expect(safePercentage('bad' as unknown as number, 100)).toBe(0);
    expect(safePercentage(25, 0)).toBeNull();
    expect(safePercentage(25, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('filters rows by search fields and bucket without backend-only assumptions', () => {
    const rows = [
      createRow({ invoiceId: 'invoice_alpha_123456', shortInvoiceId: 'alpha123', tenantName: 'أحمد علي', daysOverdue: 15 }),
      createRow({ invoiceId: 'invoice_beta_123456', shortInvoiceId: 'beta1234', tenantName: 'سارة خالد', propertyTitle: 'واحة الرياض', daysOverdue: 45 }),
      createRow({ invoiceId: 'invoice_gamma_123456', shortInvoiceId: 'gamma12', contractId: 'contract_gamma_123456', unitNumber: 'B-22', daysOverdue: 120 }),
    ];

    expect(filterOverdueInvoiceRows(rows, 'سارة', 'all').map((row) => row.invoiceId)).toEqual(['invoice_beta_123456']);
    expect(filterOverdueInvoiceRows(rows, 'B-22', 'days_90_plus').map((row) => row.invoiceId)).toEqual(['invoice_gamma_123456']);
    expect(filterOverdueInvoiceRows(rows, 'contract_gamma', 'days_1_30')).toEqual([]);
  });
});
