import { supabase } from '@/integrations/supabase/client';
import type { Payment } from '@/types/domain';

export type PaymentPayload = { invoice_id: string; amount: number; method: Payment['payment_method']; date: string; reference: string | null };

/**
 * Current generated database types expose post_receipt_atomic as returning text.
 * The active current-app migration returns the string result as-is (currently "ok"),
 * so callers must not assume this is a receipt id until the RPC contract changes.
 */
export async function postReceiptAtomic(payload: PaymentPayload): Promise<string> {
  const { data, error } = await supabase.rpc('post_receipt_atomic', payload);
  if (error) throw error;
  return data ?? '';
}
