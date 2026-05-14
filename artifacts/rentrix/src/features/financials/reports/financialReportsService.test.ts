import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

type QueryLogEntry = { table: string; method: string; args: unknown[] };
type TableResponses = Partial<Record<'invoices' | 'payments' | 'contracts' | 'expenses', unknown[]>>;

function createQueryBuilder(table: string, responses: TableResponses, log: QueryLogEntry[]) {
  const builder = {
    select: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'select', args });
      return builder;
    }),
    is: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'is', args });
      return builder;
    }),
    gte: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'gte', args });
      return builder;
    }),
    lte: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'lte', args });
      return builder;
    }),
    eq: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'eq', args });
      return builder;
    }),
    in: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'in', args });
      return builder;
    }),
    returns: vi.fn(async () => {
      log.push({ table, method: 'returns', args: [] });
      return { data: responses[table as keyof TableResponses] ?? [], error: null };
    }),
  };
  return builder;
}

function mockSupabaseTables(responses: TableResponses) {
  const log: QueryLogEntry[] = [];
  supabaseMock.from.mockImplementation((table: keyof TableResponses) => createQueryBuilder(table, responses, log));
  return log;
}

describe('financialReportsService aggregation helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters invoices by date range, status, context, and deleted_at', async () => {
    const { filterInvoicesForReport } = await import('./financialReportsService');
    const invoices = [
      {
        id: 'inv_in_range',
        contract_id: 'contract_1',
        issue_date: '2026-05-10',
        due_date: '2026-05-30',
        amount: 100,
        paid_amount: 25,
        status: 'partial' as const,
        deleted_at: null,
        contracts: { id: 'contract_1', property_id: 'property_1', tenant_id: 'tenant_1' },
      },
      {
        id: 'inv_deleted',
        contract_id: 'contract_1',
        issue_date: '2026-05-11',
        due_date: '2026-05-30',
        amount: 100,
        paid_amount: 0,
        status: 'partial' as const,
        deleted_at: '2026-05-12',
        contracts: { id: 'contract_1', property_id: 'property_1', tenant_id: 'tenant_1' },
      },
      {
        id: 'inv_wrong_date',
        contract_id: 'contract_1',
        issue_date: '2026-06-01',
        due_date: '2026-06-30',
        amount: 100,
        paid_amount: 0,
        status: 'partial' as const,
        deleted_at: null,
        contracts: { id: 'contract_1', property_id: 'property_1', tenant_id: 'tenant_1' },
      },
      {
        id: 'inv_wrong_property',
        contract_id: 'contract_2',
        issue_date: '2026-05-12',
        due_date: '2026-05-30',
        amount: 100,
        paid_amount: 0,
        status: 'partial' as const,
        deleted_at: null,
        contracts: { id: 'contract_2', property_id: 'property_2', tenant_id: 'tenant_1' },
      },
    ];

    expect(filterInvoicesForReport(invoices, {
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      propertyId: 'property_1',
      tenantId: 'tenant_1',
      status: 'partial',
    }).map((invoice) => invoice.id)).toEqual(['inv_in_range']);
  });

  it('uses financialMath helpers to safely aggregate invoice, payment, and expense values', async () => {
    const {
      summarizeInvoiceTotals,
      summarizePaymentTotals,
      summarizeExpenseTotals,
      summarizeOutstandingBalance,
    } = await import('./financialReportsService');

    expect(summarizeInvoiceTotals([
      { amount: '100' as unknown as number, paid_amount: '20' as unknown as number },
      { amount: Number.NaN, paid_amount: Number.POSITIVE_INFINITY },
      { amount: 50, paid_amount: 80 },
    ])).toEqual({ totalAmount: 150, totalPaid: 100, totalOutstanding: 80, invoicesCount: 3 });
    expect(summarizePaymentTotals([{ amount: 25 }, { amount: 'bad' as unknown as number }, { amount: '30.5' as unknown as number }])).toEqual({
      totalPaid: 55.5,
      paymentsCount: 3,
    });
    expect(summarizeExpenseTotals([{ amount: 10 }, { amount: null as unknown as number }])).toEqual({ totalExpenses: 10, expensesCount: 2 });
    expect(summarizeOutstandingBalance([
      { amount: 100, paid_amount: 40 },
      { amount: 50, paid_amount: 75 },
    ])).toEqual({ totalOutstanding: 60, invoicesCount: 1 });
  });

  it('builds a stable collection summary from independent report totals', async () => {
    const { summarizeCollectionReport } = await import('./financialReportsService');

    expect(summarizeCollectionReport({
      invoiceTotals: { totalAmount: 500, totalPaid: 100, totalOutstanding: 400, invoicesCount: 4 },
      paymentTotals: { totalPaid: '125.75' as unknown as number, paymentsCount: 3 },
      outstandingBalance: { totalOutstanding: 275, invoicesCount: 2 },
      expenseTotals: { totalExpenses: Number.NaN, expensesCount: 1 },
    })).toEqual({
      invoiced: 500,
      paid: 125.75,
      outstanding: 275,
      receiptsCount: 3,
      invoicesCount: 4,
      expensesTotal: 0,
    });
  });
});

describe('financialReportsService Supabase queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries invoice totals with deleted_at, date range, status, and contract filters', async () => {
    const log = mockSupabaseTables({
      invoices: [{
        id: 'inv_1',
        contract_id: 'contract_1',
        issue_date: '2026-05-14',
        due_date: '2026-05-31',
        amount: 200,
        paid_amount: 50,
        status: 'partial',
        deleted_at: null,
        contracts: { id: 'contract_1', property_id: 'property_1', tenant_id: 'tenant_1' },
      }],
    });
    const { getInvoiceTotalsReport } = await import('./financialReportsService');

    await expect(getInvoiceTotalsReport({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      contractId: 'contract_1',
      status: 'partial',
    })).resolves.toEqual({ totalAmount: 200, totalPaid: 50, totalOutstanding: 150, invoicesCount: 1 });

    expect(log).toEqual(expect.arrayContaining([
      { table: 'invoices', method: 'is', args: ['deleted_at', null] },
      { table: 'invoices', method: 'gte', args: ['issue_date', '2026-05-01'] },
      { table: 'invoices', method: 'lte', args: ['issue_date', '2026-05-31'] },
      { table: 'invoices', method: 'eq', args: ['status', 'partial'] },
      { table: 'invoices', method: 'eq', args: ['contract_id', 'contract_1'] },
    ]));
  });

  it('derives receipt/payment totals from posted payments without mutating payment records', async () => {
    const log = mockSupabaseTables({
      payments: [{ id: 'payment_1', invoice_id: 'invoice_1', amount: 75, payment_date: '2026-05-14', deleted_at: null }],
      invoices: [{ id: 'invoice_1', contract_id: 'contract_1', deleted_at: null }],
      contracts: [{ id: 'contract_1', property_id: 'property_1', tenant_id: 'tenant_1' }],
    });
    const { getReceiptTotalsReport } = await import('./financialReportsService');

    await expect(getReceiptTotalsReport({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      propertyId: 'property_1',
      tenantId: 'tenant_1',
    })).resolves.toEqual({ totalPaid: 75, paymentsCount: 1 });

    expect(log).toEqual(expect.arrayContaining([
      { table: 'payments', method: 'is', args: ['deleted_at', null] },
      { table: 'payments', method: 'gte', args: ['payment_date', '2026-05-01'] },
      { table: 'payments', method: 'lte', args: ['payment_date', '2026-05-31'] },
      { table: 'invoices', method: 'is', args: ['deleted_at', null] },
      { table: 'contracts', method: 'is', args: ['deleted_at', null] },
    ]));
    expect(log.some((entry) => ['insert', 'update', 'delete', 'rpc'].includes(entry.method))).toBe(false);
  });
});
