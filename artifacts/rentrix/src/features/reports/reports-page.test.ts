import { describe, expect, it } from 'vitest';
import { buildExpenseBreakdownRows, buildPaymentsTrendRows } from './reports-page.helpers';

describe('ReportsPage chart shaping helpers', () => {
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

  it('maps canonical expense breakdown rows to chart rows without recalculating totals', () => {
    expect(buildExpenseBreakdownRows({
      totalExpenses: 125,
      expensesCount: 2,
      byCategory: [
        { category: 'صيانة', total: 100, count: 1 },
        { category: 'مرافق', total: 25, count: 1 },
      ],
      byProperty: [],
    })).toEqual([
      { name: 'صيانة', value: 100, count: 1 },
      { name: 'مرافق', value: 25, count: 1 },
    ]);
  });
});
