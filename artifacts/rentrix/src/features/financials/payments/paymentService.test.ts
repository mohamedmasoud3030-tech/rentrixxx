import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

describe('postReceiptAtomic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the post_receipt_atomic RPC result string', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'payment_123', error: null });
    const { postReceiptAtomic } = await import('./paymentService');
    const payload = {
      invoice_id: 'inv_1',
      amount: 50,
      method: 'cash' as const,
      date: '2026-05-14',
      reference: null,
    };

    await expect(postReceiptAtomic(payload)).resolves.toBe('payment_123');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('post_receipt_atomic', { payload });
  });



  it('throws when RPC succeeds but returns an empty payment id', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: '', error: null });
    const { postReceiptAtomic } = await import('./paymentService');
    const payload = {
      invoice_id: 'inv_1',
      amount: 50,
      method: 'cash' as const,
      date: '2026-05-14',
      reference: null,
    };

    await expect(postReceiptAtomic(payload)).rejects.toThrow('post_receipt_atomic returned an invalid payment id');
  });

  it('propagates RPC validation/authorization errors from post_receipt_atomic', async () => {
    const { postReceiptAtomic } = await import('./paymentService');
    const payload = {
      invoice_id: 'inv_1',
      amount: 50,
      method: 'cash' as const,
      date: '2026-05-14',
      reference: null,
    };

    const rpcErrors = [
      'Insufficient privileges to post payment receipts',
      'Payment exceeds remaining balance',
      'Invoice not found',
      'Amount must be positive',
    ];

    for (const message of rpcErrors) {
      supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: new Error(message) });
      await expect(postReceiptAtomic(payload)).rejects.toThrow(message);
    }
  });

});
