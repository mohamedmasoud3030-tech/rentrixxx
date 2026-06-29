import { describe, it, expect } from 'vitest';
import {
  calculateOwnerSettlement,
  calculateOfficeProfitability,
  getReceiptPropertyId,
} from '@/domain/financial-settlements';
import type { Expense, Invoice, LeaseContract, OwnerAgreement, PaymentReceipt } from '@/domain/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const agreement_pm: OwnerAgreement = {
  id: 'agr-1',
  ownerId: 'owner-1',
  propertyId: 'prop-1',
  agreementType: 'property_management',
  startDate: '2025-01-01',
  status: 'active',
  commissionRate: 10,
  fixedFee: 100,
  isArchived: false,
  createdAt: '2025-01-01T00:00:00Z',
};

const agreement_ml: OwnerAgreement = {
  id: 'agr-2',
  ownerId: 'owner-2',
  propertyId: 'prop-2',
  agreementType: 'master_lease',
  startDate: '2025-01-01',
  status: 'active',
  fixedFee: 2000,
  isArchived: false,
  createdAt: '2025-01-01T00:00:00Z',
};

const receipts: PaymentReceipt[] = [
  { id: 'r-1', invoiceId: 'inv-1', amount: 5000, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'r-2', invoiceId: 'inv-2', amount: 3000, paymentDate: '2026-02-01', paymentMethod: 'cash', createdAt: '2026-02-01T00:00:00Z' },
];

const expenses: Expense[] = [
  { id: 'e-1', propertyId: 'prop-1', amount: 500, expenseDate: '2026-01-15', description: 'صيانة', responsibility: 'owner', isArchived: false, createdAt: '2026-01-15T00:00:00Z' },
  { id: 'e-2', propertyId: 'prop-1', amount: 200, expenseDate: '2026-01-20', description: 'تنظيف', responsibility: 'shared', isArchived: false, createdAt: '2026-01-20T00:00:00Z' },
  { id: 'e-3', propertyId: 'prop-1', amount: 300, expenseDate: '2026-01-25', description: 'إدارية', responsibility: 'office', isArchived: false, createdAt: '2026-01-25T00:00:00Z' },
  { id: 'e-archived', propertyId: 'prop-1', amount: 9999, expenseDate: '2026-01-25', description: 'ملغاة', responsibility: 'owner', isArchived: true, createdAt: '2026-01-25T00:00:00Z' },
];

// ─── calculateOwnerSettlement ─────────────────────────────────────────────────

describe('calculateOwnerSettlement — property_management', () => {
  it('computes grossRevenue as sum of receipts', () => {
    const result = calculateOwnerSettlement(agreement_pm, receipts, []);
    expect(result.grossRevenue).toBe(8000); // 5000 + 3000
  });

  it('deducts commission (10%) + fixedFee (100) from gross', () => {
    const result = calculateOwnerSettlement(agreement_pm, receipts, []);
    // feesDeducted = 8000 * 0.10 + 100 = 900
    expect(result.feesDeducted).toBe(900);
  });

  it('deducts owner and shared expenses only (ignores office, ignores archived)', () => {
    const result = calculateOwnerSettlement(agreement_pm, receipts, expenses);
    // ownerExpenses = e-1 (500) + e-2 (200 shared) = 700 (e-3 is office, e-archived is archived)
    expect(result.expensesDeducted).toBe(700);
  });

  it('computes correct net payout', () => {
    const result = calculateOwnerSettlement(agreement_pm, receipts, expenses);
    // net = 8000 - 900 - 700 = 6400
    expect(result.netPayout).toBe(6400);
  });

  it('returns zero fees when commissionRate and fixedFee are both absent', () => {
    const agr: OwnerAgreement = { ...agreement_pm, commissionRate: undefined, fixedFee: undefined };
    const result = calculateOwnerSettlement(agr, receipts, []);
    expect(result.feesDeducted).toBe(0);
    expect(result.netPayout).toBe(result.grossRevenue);
  });
});

describe('calculateOwnerSettlement — master_lease', () => {
  it('uses fixedFee as gross revenue (not receipts)', () => {
    const result = calculateOwnerSettlement(agreement_ml, receipts, []);
    expect(result.grossRevenue).toBe(2000);
  });

  it('has zero feesDeducted for master_lease', () => {
    const result = calculateOwnerSettlement(agreement_ml, receipts, []);
    expect(result.feesDeducted).toBe(0);
  });

  it('deducts owner expenses from net payout', () => {
    const result = calculateOwnerSettlement(agreement_ml, receipts, expenses);
    // ownerExpenses = 700 (e-1 owner + e-2 shared)
    expect(result.netPayout).toBe(2000 - 700);
  });
});

// ─── getReceiptPropertyId ─────────────────────────────────────────────────────

describe('getReceiptPropertyId', () => {
  const invoices: Invoice[] = [
    { id: 'inv-1', contractId: 'c-1', amount: 5000, dueDate: '2026-01-01', status: 'paid', createdAt: '2026-01-01T00:00:00Z' },
  ];
  const contracts: LeaseContract[] = [
    { id: 'c-1', tenantId: 't-1', unitId: 'u-1', propertyId: 'prop-A', agreementId: 'agr-1', startDate: '2025-01-01', endDate: '2026-01-01', status: 'active', rentAmount: 5000, paymentFrequency: 'monthly', createdAt: '2025-01-01T00:00:00Z' },
  ];

  it('resolves property ID from receipt → invoice → contract chain', () => {
    const receipt: PaymentReceipt = { id: 'r-1', invoiceId: 'inv-1', amount: 5000, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' };
    expect(getReceiptPropertyId(receipt, invoices, contracts)).toBe('prop-A');
  });

  it('returns null when invoice not found', () => {
    const receipt: PaymentReceipt = { id: 'r-ghost', invoiceId: 'inv-ghost', amount: 100, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' };
    expect(getReceiptPropertyId(receipt, invoices, contracts)).toBeNull();
  });

  it('returns null when contract not found', () => {
    const orphanInvoices: Invoice[] = [{ id: 'inv-orphan', contractId: 'c-ghost', amount: 100, dueDate: '2026-01-01', status: 'unpaid', createdAt: '2026-01-01T00:00:00Z' }];
    const receipt: PaymentReceipt = { id: 'r-1', invoiceId: 'inv-orphan', amount: 100, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' };
    expect(getReceiptPropertyId(receipt, orphanInvoices, contracts)).toBeNull();
  });
});

// ─── calculateOfficeProfitability ────────────────────────────────────────────

describe('calculateOfficeProfitability', () => {
  const contracts: LeaseContract[] = [
    { id: 'c-1', tenantId: 't-1', unitId: 'u-1', propertyId: 'prop-1', agreementId: 'agr-1', startDate: '2025-01-01', endDate: '2026-01-01', status: 'active', rentAmount: 5000, paymentFrequency: 'monthly', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'c-2', tenantId: 't-2', unitId: 'u-2', propertyId: 'prop-2', agreementId: 'agr-2', startDate: '2025-01-01', endDate: '2026-01-01', status: 'active', rentAmount: 3000, paymentFrequency: 'monthly', createdAt: '2025-01-01T00:00:00Z' },
  ];
  const invoices: Invoice[] = [
    { id: 'inv-1', contractId: 'c-1', amount: 5000, dueDate: '2026-01-01', status: 'paid', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'inv-2', contractId: 'c-2', amount: 3000, dueDate: '2026-01-01', status: 'paid', createdAt: '2026-01-01T00:00:00Z' },
  ];
  const allReceipts: PaymentReceipt[] = [
    { id: 'r-1', invoiceId: 'inv-1', amount: 5000, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'r-2', invoiceId: 'inv-2', amount: 3000, paymentDate: '2026-01-01', paymentMethod: 'cash', createdAt: '2026-01-01T00:00:00Z' },
  ];

  it('sums management fees for property_management agreements', () => {
    // agr-1: property_management, 10% comm + 100 fixed. receipts prop-1 = 5000
    // fee = 5000 * 0.10 + 100 = 600
    const result = calculateOfficeProfitability([agreement_pm], allReceipts, invoices, contracts, []);
    expect(result.totalManagementFees).toBe(600);
  });

  it('sums master_lease margins (grossRevenue - fixedObligation)', () => {
    // agr-2: master_lease, fixedFee=2000. receipts prop-2 = 3000
    // margin = 3000 - 2000 = 1000
    const result = calculateOfficeProfitability([agreement_ml], allReceipts, invoices, contracts, []);
    expect(result.totalMasterLeaseMargins).toBe(1000);
  });

  it('deducts office and shared expenses from net revenue', () => {
    // office expenses: e-3(300 office) + e-2(200 shared) = 500
    const result = calculateOfficeProfitability([agreement_pm], allReceipts, invoices, contracts, expenses);
    expect(result.totalOperationalExpenses).toBe(500);
  });

  it('computes correct net revenue across mixed agreements', () => {
    const result = calculateOfficeProfitability(
      [agreement_pm, agreement_ml],
      allReceipts,
      invoices,
      contracts,
      expenses
    );
    // mgmt fees = 600, ml margins = 1000, office expenses = 500
    // net = 600 + 1000 - 500 = 1100
    expect(result.netRevenue).toBe(1100);
  });

  it('skips archived agreements', () => {
    const archived: OwnerAgreement = { ...agreement_pm, id: 'agr-archived', isArchived: true };
    const result = calculateOfficeProfitability([archived], allReceipts, invoices, contracts, []);
    expect(result.totalManagementFees).toBe(0);
  });

  it('returns zero summary when no agreements', () => {
    const result = calculateOfficeProfitability([], [], [], [], []);
    expect(result.netRevenue).toBe(0);
    expect(result.totalManagementFees).toBe(0);
    expect(result.totalMasterLeaseMargins).toBe(0);
    expect(result.totalOperationalExpenses).toBe(0);
  });
});
