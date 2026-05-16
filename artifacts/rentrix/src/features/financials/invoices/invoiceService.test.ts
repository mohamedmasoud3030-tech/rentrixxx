import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invoice } from '@/types/domain';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

type TableName = 'invoices' | 'payments';
type TableResponses = Partial<Record<TableName, unknown[]>>;
type QueryLogEntry = { table: string; method: string; args: unknown[] };

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
    eq: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'eq', args });
      return builder;
    }),
    or: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'or', args });
      return builder;
    }),
    order: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'order', args });
      return builder;
    }),
    single: vi.fn(() => {
      log.push({ table, method: 'single', args: [] });
      return builder;
    }),
    returns: vi.fn(async () => {
      log.push({ table, method: 'returns', args: [] });
      const rows = responses[table as TableName] ?? [];
      return {
        data: table === 'invoices' && builder.single.mock.calls.length > 0 ? rows[0] ?? null : rows,
        error: null,
      };
    }),
  };
  return builder;
}

function mockSupabaseTables(responses: TableResponses) {
  const log: QueryLogEntry[] = [];
  supabaseMock.from.mockImplementation((table: TableName) => createQueryBuilder(table, responses, log));
  return log;
}

const invoiceRows: Array<Pick<Invoice, 'amount' | 'paid_amount'>> = [
  { amount: 1000, paid_amount: 1000 },
  { amount: 750, paid_amount: 250 },
  { amount: '900.5' as unknown as number, paid_amount: '100.5' as unknown as number },
  { amount: 400, paid_amount: 450 },
];

describe('invoiceService financial reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('summarizes invoice truth from canonical amount, paid, and clamped remaining values', async () => {
    const { summarizeInvoices } = await import('./invoiceService');

    expect(summarizeInvoices(invoiceRows)).toEqual({
      totalAmount: 3050.5,
      totalPaid: 1800.5,
      totalRemaining: 1300,
      count: 4,
    });
  });

  it('lists invoices through read-only filters without issuing payment writes or RPC calls', async () => {
    const log = mockSupabaseTables({
      invoices: [{ id: 'invoice_1', amount: 750, paid_amount: 250, status: 'partial' }],
    });
    const { listInvoices } = await import('./invoiceService');

    await expect(listInvoices({ status: 'partial', search: 'invoice_%' })).resolves.toEqual([
      { id: 'invoice_1', amount: 750, paid_amount: 250, status: 'partial' },
    ]);

    expect(log).toEqual(expect.arrayContaining([
      { table: 'invoices', method: 'is', args: ['deleted_at', null] },
      { table: 'invoices', method: 'eq', args: ['status', 'partial'] },
      { table: 'invoices', method: 'or', args: ['id.ilike."%invoice\\_\\%%",status.ilike."%invoice\\_\\%%"'] },
    ]));
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(log.some((entry) => ['insert', 'update', 'delete', 'upsert'].includes(entry.method))).toBe(false);
  });

  it('reconciles invoice detail payments as read-only evidence for the selected invoice', async () => {
    const log = mockSupabaseTables({
      invoices: [{ id: 'invoice_1', amount: 1200, paid_amount: 700, status: 'partial', contracts: null }],
      payments: [
        { id: 'payment_2', invoice_id: 'invoice_1', amount: 300, payment_date: '2026-05-10', deleted_at: null },
        { id: 'payment_1', invoice_id: 'invoice_1', amount: 400, payment_date: '2026-05-01', deleted_at: null },
      ],
    });
    const { getInvoiceDetail, summarizeInvoices } = await import('./invoiceService');

    const invoice = await getInvoiceDetail('invoice_1');

    expect(invoice.payments.map((payment) => payment.amount)).toEqual([300, 400]);
    expect(summarizeInvoices([invoice])).toMatchObject({ totalAmount: 1200, totalPaid: 700, totalRemaining: 500 });
    expect(log).toEqual(expect.arrayContaining([
      { table: 'invoices', method: 'eq', args: ['id', 'invoice_1'] },
      { table: 'payments', method: 'eq', args: ['invoice_id', 'invoice_1'] },
      { table: 'payments', method: 'is', args: ['deleted_at', null] },
    ]));
  });
});
