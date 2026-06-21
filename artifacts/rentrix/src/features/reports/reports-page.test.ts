import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ContractListItem } from '@/features/contracts/services/contractService';

const reportsPageMocks = vi.hoisted(() => ({
  propertyTitlesQuery: { data: [], error: null as Error | null, isLoading: false },
  financialSummaryQuery: { data: { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, netCash: 0 }, error: null as Error | null, isLoading: false },
  financialCashflowQuery: { data: { rows: [] }, error: null as Error | null, isLoading: false },
  dailyCollectionQuery: { data: { rows: [] }, error: null as Error | null, isLoading: false },
  expenseBreakdownQuery: { data: { rows: [], totalExpenses: 0 }, error: null as Error | null, isLoading: false },
  overdueInvoicesQuery: { data: { rows: [] }, error: null as Error | null, isLoading: false },
  agedReceivablesQuery: { data: { buckets: {}, totalOutstanding: 0, invoiceCount: 0 }, error: null as Error | null, isLoading: false },
  contractsQuery: { data: [], error: null as Error | null, isLoading: false },
  unitsQuery: { data: [], error: null as Error | null, isLoading: false },
  receiptsQuery: { data: [], error: null as Error | null, isLoading: false },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => reportsPageMocks.propertyTitlesQuery,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, href }: { children: unknown; to?: string; href?: string }) => createElement('a', { href: to ?? href ?? '#' }, children),
}));

vi.mock('@/features/contracts/useContracts', () => ({
  useContracts: () => reportsPageMocks.contractsQuery,
}));

vi.mock('@/features/financials/receipts/useReceipts', () => ({
  useReceipts: () => reportsPageMocks.receiptsQuery,
}));

vi.mock('@/features/financials/reports/useFinancialReports', () => ({
  useAgedReceivablesReport: () => reportsPageMocks.agedReceivablesQuery,
  useDailyCollectionReport: () => reportsPageMocks.dailyCollectionQuery,
  useExpenseBreakdownReport: () => reportsPageMocks.expenseBreakdownQuery,
  useFinancialCashflowReport: () => reportsPageMocks.financialCashflowQuery,
  useFinancialPeriodSummaryReport: () => reportsPageMocks.financialSummaryQuery,
  useOverdueInvoicesReport: () => reportsPageMocks.overdueInvoicesQuery,
}));

vi.mock('@/features/units/use-units', () => ({
  useAllUnits: () => reportsPageMocks.unitsQuery,
}));

import { buildAgingBucketChartRows, buildOccupancyRows, buildPaymentsTrendRows, buildRentRollRows, createReceiptPrintHref } from './reports-page.helpers';
import { buildReportCsvFilename, escapeCsvValue, ReportsPage, toDateInputValue } from './reports-page';

function resetReportsPageMocks() {
  reportsPageMocks.propertyTitlesQuery = { data: [], error: null, isLoading: false };
  reportsPageMocks.financialSummaryQuery = { data: { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, netCash: 0 }, error: null, isLoading: false };
  reportsPageMocks.financialCashflowQuery = { data: { rows: [] }, error: null, isLoading: false };
  reportsPageMocks.dailyCollectionQuery = { data: { rows: [] }, error: null, isLoading: false };
  reportsPageMocks.expenseBreakdownQuery = { data: { rows: [], totalExpenses: 0 }, error: null, isLoading: false };
  reportsPageMocks.overdueInvoicesQuery = { data: { rows: [] }, error: null, isLoading: false };
  reportsPageMocks.agedReceivablesQuery = { data: { buckets: {}, totalOutstanding: 0, invoiceCount: 0 }, error: null, isLoading: false };
  reportsPageMocks.contractsQuery = { data: [], error: null, isLoading: false };
  reportsPageMocks.unitsQuery = { data: [], error: null, isLoading: false };
  reportsPageMocks.receiptsQuery = { data: [], error: null, isLoading: false };
}

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
    attachment_url: null,
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
  afterEach(() => {
    vi.useRealTimers();
    resetReportsPageMocks();
  });

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

  it('falls back to an unnamed placeholder with short id helper when no property title is supplied', () => {
    expect(buildOccupancyRows([
      { property_id: 'alpha_property', status: 'occupied' },
      { property_id: 'alpha_property', status: 'available' },
      { property_id: 'alpha_property', status: 'maintenance' },
      { property_id: 'beta_property', status: 'occupied' },
    ])).toEqual([
      { property: 'عقار بدون اسم', propertyId: 'alpha_property', shortPropertyId: 'alpha_pr', hasTitle: false, occupied: 1, vacant: 2 },
      { property: 'عقار بدون اسم', propertyId: 'beta_property', shortPropertyId: 'beta_pro', hasTitle: false, occupied: 1, vacant: 0 },
    ]);
  });

  it('uses the property title and orders titled rows first when titles are supplied', () => {
    expect(buildOccupancyRows(
      [
        { property_id: 'alpha_property', status: 'occupied' },
        { property_id: 'beta_property', status: 'occupied' },
        { property_id: 'gamma_property', status: 'maintenance' },
      ],
      [
        { id: 'beta_property', title: 'برج النخيل' },
        { id: 'gamma_property', title: '   ' }, // blank titles are ignored
      ],
    )).toEqual([
      { property: 'برج النخيل', propertyId: 'beta_property', shortPropertyId: 'beta_pro', hasTitle: true, occupied: 1, vacant: 0 },
      { property: 'عقار بدون اسم', propertyId: 'alpha_property', shortPropertyId: 'alpha_pr', hasTitle: false, occupied: 1, vacant: 0 },
      { property: 'عقار بدون اسم', propertyId: 'gamma_property', shortPropertyId: 'gamma_pr', hasTitle: false, occupied: 0, vacant: 1 },
    ]);
  });

  it('builds aging bucket chart rows in the requested display order', () => {
    expect(buildAgingBucketChartRows({
      current: { label: 'غير متأخر', total: 20, invoiceCount: 2 },
      days_90_plus: { label: 'أكثر من 90 يوم', total: 300, invoiceCount: 3 },
    }, ['current', 'days_1_30', 'days_90_plus'])).toEqual([
      { bucket: 'غير متأخر', total: 20, invoiceCount: 2 },
      { bucket: 'days_1_30', total: 0, invoiceCount: 0 },
      { bucket: 'أكثر من 90 يوم', total: 300, invoiceCount: 3 },
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
    expect(createReceiptPrintHref('receipt id/42')).toBe('/receipts?receiptId=receipt%20id%2F42');
  });

  it('neutralizes spreadsheet formulas in exported CSV string values', () => {
    expect(escapeCsvValue('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(\\"https://example.test\\")"');
    expect(escapeCsvValue(' +SUM(1,2)')).toBe('"\' +SUM(1,2)"');
    expect(escapeCsvValue('@tenant')).toBe('"\'@tenant"');
    expect(escapeCsvValue('safe tenant')).toBe('"safe tenant"');
  });

  it('formats report filter dates from the local day instead of UTC serialization', () => {
    const utcDate = new Date('2026-01-01T01:30:00.000Z');
    const localDate = Object.assign(utcDate, {
      getFullYear: () => 2025,
      getMonth: () => 11,
      getDate: () => 31,
    });

    expect(utcDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(toDateInputValue(localDate)).toBe('2025-12-31');
  });

  it('builds date-stamped CSV filenames for all report exports', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T10:30:00.000Z'));

    expect(buildReportCsvFilename('financial-summary')).toBe('financial-summary-2026-06-16.csv');
    expect(buildReportCsvFilename('rent-roll')).toBe('rent-roll-2026-06-16.csv');
    expect(buildReportCsvFilename('overdue-invoices')).toBe('overdue-invoices-2026-06-16.csv');
    expect(buildReportCsvFilename('aged-receivables')).toBe('aged-receivables-2026-06-16.csv');
    expect(buildReportCsvFilename('daily-collection')).toBe('daily-collection-2026-06-16.csv');
  });
});

describe('ReportsPage query aggregation', () => {
  afterEach(() => {
    resetReportsPageMocks();
  });

  it('joins property title loading into the reports loading state', () => {
    reportsPageMocks.propertyTitlesQuery = { data: [], error: null, isLoading: true };

    const html = renderToStaticMarkup(createElement(ReportsPage));

    expect(html).toContain('جارٍ تحميل هذا التقرير');
  });

  it('joins property title failures into the reports error banner', () => {
    reportsPageMocks.propertyTitlesQuery = { data: [], error: new Error('property title failure'), isLoading: false };

    const html = renderToStaticMarkup(createElement(ReportsPage));

    expect(html).toContain('property title failure');
  });
});
