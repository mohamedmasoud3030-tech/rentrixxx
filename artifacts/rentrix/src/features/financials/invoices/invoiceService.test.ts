import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

describe('invoiceService summary helpers', () => {
  it('summarizes invoices with the same clamped remaining balance truth as financialMath', async () => {
    const { summarizeInvoices } = await import('./invoiceService');

    expect(summarizeInvoices([
      { amount: 1000, paid_amount: 0 },
      { amount: 1000, paid_amount: 300 },
      { amount: 1000, paid_amount: 1000 },
      { amount: 1000, paid_amount: 1200 },
      { amount: 'bad' as unknown as number, paid_amount: null as unknown as number },
    ])).toEqual({
      totalAmount: 4000,
      totalPaid: 2500,
      totalRemaining: 1700,
      count: 5,
    });
  });
});
