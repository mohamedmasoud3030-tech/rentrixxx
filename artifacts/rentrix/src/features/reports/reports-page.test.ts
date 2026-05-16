import { describe, expect, it } from 'vitest';
import type { ContractListItem } from '@/features/contracts/services/contractService';
import { buildOccupancyRows, buildPaymentsTrendRows, buildRentRollRows, createReceiptPrintHref, deferredReports } from './reports-page.helpers';

function createContract(overrides: Partial<ContractListItem>): ContractListItem {
  return {
    id: 'contract_a',
    property_id: 'property_a',
    unit_id: 'unit_a',
    tenant_id: 'tenant_a',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    rent_amount: 1200,
    payment_cycle: 'monthly',
    status: 'active',
    cancellation_reason: null,
    renewed_from_id: null,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    properties: { id: 'property_a', title: 'برج النخيل', address: 'Dubai' },
    units: { id: 'unit_a', unit_number: '101', floor: '1', status: 'occupied', rent_amount: 1200 },
    people: { id: 'tenant_a', full_name: 'أحمد علي', phone: null, email: null, national_id: null },
    ...overrides,
  };
}

describe('ReportsPage shaping helpers', () => {
  it('combines canonical daily collection and overdue invoice rows by month', () => {
    expect(buildPaymentsTrendRows({
      dailyCollections: [
        { paymentDate: '2026-05-01', totalPaid: 100, paymentsCount: 1, methodTotals: { cash: 100, bank_transfer: 0, card: 0, check: 0, other: 0 } },
        { paymentDate: '2026-05-20', totalPaid: 75, paymentsCount: 1, methodTotals: { cash: 0, bank_transfer: 75, card: 0, check: 0, other: 0 } },
        { paymentDate: '2026-06-01', totalPaid: 25, paymentsCount: 1, methodTotals: { cash: 0, bank_transfer: 0, card: 25, check: 0, other: 0 } },
      ],
      overdueInvoices: [
        { invoiceId: 'invoice_1', shortInvoiceId: 'invoice_', contractId: 'contract_1', tenantId: null, tenantName: null, propertyId: null, propertyTitle: null, unitId: null, unitNumber: null, dueDate: '2026-05-10', daysOverdue: 4, amount: 200, paidAmount: 50, remainingAmount: 150, status: 'partial' },
        { invoiceId: 'invoice_2', shortInvoiceId: 'invoice_', contractId: 'contract_2', tenantId: null, tenantName: null, propertyId: null, propertyTitle: null, unitId: null, unitNumber: null, dueDate: '2026-04-30', daysOverdue: 14, amount: 100, paidAmount: 0, remainingAmount: 100, status: 'issued' },
      ],
    })).toEqual([
      { month: '2026-04', collections: 0, overdue: 100 },
      { month: '2026-05', collections: 175, overdue: 150 },
      { month: '2026-06', collections: 25, overdue: 0 },
    ]);
  });

  it('preserves the occupancy chart shape from current unit service rows', () => {
    expect(buildOccupancyRows([
      { property_id: 'alpha_property', status: 'occupied' },
      { property_id: 'alpha_property', status: 'available' },
      { property_id: 'alpha_property', status: 'maintenance' },
      { property_id: 'beta_property', status: 'occupied' },
    ])).toEqual([
      { property: 'alpha_pr', occupied: 1, vacant: 2 },
      { property: 'beta_pro', occupied: 1, vacant: 0 },
    ]);
  });

  it('builds rent roll rows from current contract list items without creating balances', () => {
    expect(buildRentRollRows([
      createContract({ id: 'contract_b', people: { id: 'tenant_b', full_name: 'منى سالم', phone: null, email: null, national_id: null } }),
      createContract({ id: 'contract_a' }),
    ], { active: 'نشط', draft: 'مسودة', expired: 'منتهي', terminated: 'منهى' })).toEqual([
      {
        contractId: 'contract_a',
        tenantName: 'أحمد علي',
        propertyTitle: 'برج النخيل',
        unitNumber: '101',
        rentAmount: 1200,
        paymentCycle: 'شهري',
        statusLabel: 'نشط',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      {
        contractId: 'contract_b',
        tenantName: 'منى سالم',
        propertyTitle: 'برج النخيل',
        unitNumber: '101',
        rentAmount: 1200,
        paymentCycle: 'شهري',
        statusLabel: 'نشط',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    ]);
  });

  it('creates receipt print links with the merged query-string route only', () => {
    const href = createReceiptPrintHref('receipt id/42');

    expect(href).toBe('/receipts?receiptId=receipt%20id%2F42');
    expect(href).not.toContain('/receipts/');
  });

  it('keeps unsupported accounting and statement reports deferred without fake balances', () => {
    expect(deferredReports.map((report) => report.title)).toEqual([
      'Owner Statement',
      'Tenant Statement',
      'Trial Balance',
      'Income Statement',
      'Balance Sheet',
    ]);
    expect(deferredReports).toHaveLength(5);

    for (const report of deferredReports) {
      expect(report.reason).toContain('مؤجل');
      expect(report.reason).not.toMatch(/\b\d+(?:\.\d+)?\b/);
      expect(report.reason).not.toMatch(/balance:\s*|debit:\s*|credit:\s*/i);
    }
  });

});
