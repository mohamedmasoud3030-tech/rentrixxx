import type { SupabaseClient } from '@supabase/supabase-js';
import type { Payment } from '@/types/domain';

export type PaymentPayload = { invoice_id: string; amount: number; method: Payment['payment_method']; date: string; reference: string | null };

export async function postReceiptAtomic(supabase: SupabaseClient, payload: PaymentPayload): Promise<string> {
  const { data, error } = await supabase.rpc('post_receipt_atomic', { payload });
  if (error) throw error;
  const paymentId = typeof data === 'string'
    ? data
    : data && typeof data === 'object' && 'payment_id' in data
      ? (data as { payment_id?: unknown }).payment_id
      : null;
  if (typeof paymentId !== 'string' || !paymentId) {
    throw new Error('post_receipt_atomic returned an invalid payment id');
  }
  return paymentId;
}
