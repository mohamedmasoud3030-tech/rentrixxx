import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/types/domain';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

const basePayment: Payment = {
  id: 'pay_1234567890abcdef',
  invoice_id: 'inv_1',
  amount: 1250.5,
  payment_method: 'cash',
  reference_number: 'REF-1',
  payment_date: '2026-05-14',
  created_at: '2026-05-14T10:30:00Z',
  updated_at: '2026-05-14T10:30:00Z',
  deleted_at: null,
};


function createPaymentFixture(overrides: Partial<Payment> = {}): Payment {
  return { ...basePayment, ...overrides };
}

type TableName = 'payments' | 'invoices' | 'contracts' | 'units' | 'properties' | 'people';
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
    in: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'in', args });
      return builder;
    }),
    eq: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'eq', args });
      return builder;
    }),
    order: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'order', args });
      return builder;
    }),
    limit: vi.fn((...args: unknown[]) => {
      log.push({ table, method: 'limit', args });
      return builder;
    }),
    single: vi.fn(() => {
      log.push({ table, method: 'single', args: [] });
      return builder;
    }),
    returns: vi.fn(async () => {
      log.push({ table, method: 'returns', args: [] });
      const data = responses[table as TableName] ?? [];
      return {
        data: table === 'payments' && builder.single.mock.calls.length > 0 ? data[0] ?? null : data,
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

describe('receiptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats receipt numbers from the payment id prefix', async () => {
    const { formatReceiptNumber } = await import('./receiptService');

    expect(formatReceiptNumber('1234567890abcdef')).toBe('REC-12345678');
  });

  it('lists receipt projections with batched invoice, contract, tenant, unit, and property enrichment', async () => {
    const log = mockSupabaseTables({
      payments: [basePayment],
      invoices: [{ id: 'inv_1', contract_id: 'contract_1', status: 'paid' }],
      contracts: [{ id: 'contract_1', property_id: 'property_1', unit_id: 'unit_1', tenant_id: 'tenant_1' }],
      units: [{ id: 'unit_1', unit_number: 'A-101' }],
      properties: [{ id: 'property_1', title: 'Tower A' }],
      people: [{ id: 'tenant_1', full_name: 'Test Tenant' }],
    });
    const { listReceipts } = await import('./receiptService');

    const receipts = await listReceipts({ limit: 10 });

    expect(receipts).toEqual([
      {
        id: 'pay_1234567890abcdef',
        receipt_number: 'REC-pay_1234',
        payment_id: 'pay_1234567890abcdef',
        invoice_id: 'inv_1',
        invoice_status: 'paid',
        contract_id: 'contract_1',
        payment_date: '2026-05-14',
        amount: 1250.5,
        payment_method: 'cash',
        reference_number: 'REF-1',
        created_at: '2026-05-14T10:30:00Z',
        status: 'posted',
        tenant_name: 'Test Tenant',
        unit_number: 'A-101',
        property_title: 'Tower A',
      },
    ]);
    expect(supabaseMock.from).toHaveBeenCalledTimes(6);
    expect(supabaseMock.from.mock.calls.map(([table]) => table)).toEqual([
      'payments',
      'invoices',
      'contracts',
      'units',
      'properties',
      'people',
    ]);
    expect(log.filter((entry) => entry.method === 'in')).toEqual([
      { table: 'invoices', method: 'in', args: ['id', ['inv_1']] },
      { table: 'contracts', method: 'in', args: ['id', ['contract_1']] },
      { table: 'units', method: 'in', args: ['id', ['unit_1']] },
      { table: 'properties', method: 'in', args: ['id', ['property_1']] },
      { table: 'people', method: 'in', args: ['id', ['tenant_1']] },
    ]);
  });

  it('projects receipt detail from a single payment id', async () => {
    mockSupabaseTables({
      payments: [basePayment],
      invoices: [{ id: 'inv_1', contract_id: null, status: 'partial' }],
    });
    const { getReceiptDetail } = await import('./receiptService');

    const receipt = await getReceiptDetail('pay_1234567890abcdef');

    expect(receipt).toMatchObject({
      id: 'pay_1234567890abcdef',
      receipt_number: 'REC-pay_1234',
      payment_id: 'pay_1234567890abcdef',
      invoice_id: 'inv_1',
      invoice_status: 'partial',
      contract_id: null,
      tenant_name: null,
      unit_number: null,
      property_title: null,
      status: 'posted',
    });
  });

  it('uses posted payment amounts as receipt truth without deriving balances', async () => {
    mockSupabaseTables({
      payments: [
        createPaymentFixture({ id: 'payment_cash', amount: 300, payment_method: 'cash' }),
        createPaymentFixture({ id: 'payment_bank', amount: 450.75, payment_method: 'bank_transfer', reference_number: null }),
      ],
      invoices: [{ id: 'inv_1', contract_id: 'contract_1', status: 'partial' }],
      contracts: [{ id: 'contract_1', property_id: 'property_1', unit_id: 'unit_1', tenant_id: 'tenant_1' }],
      units: [{ id: 'unit_1', unit_number: 'A-101' }],
      properties: [{ id: 'property_1', title: 'Tower A' }],
      people: [{ id: 'tenant_1', full_name: 'Test Tenant' }],
    });
    const { listReceipts } = await import('./receiptService');

    const receipts = await listReceipts({ limit: 25 });

    expect(receipts.map((receipt) => ({ id: receipt.id, amount: receipt.amount, status: receipt.status }))).toEqual([
      { id: 'payment_cash', amount: 300, status: 'posted' },
      { id: 'payment_bank', amount: 450.75, status: 'posted' },
    ]);
    expect(receipts.reduce((total, receipt) => total + receipt.amount, 0)).toBe(750.75);
    expect(receipts.every((receipt) => !('remaining_amount' in receipt))).toBe(true);
  });
});
