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
    expect(supabaseMock.rpc).toHaveBeenCalledWith('post_receipt_atomic', payload);
  });
});
