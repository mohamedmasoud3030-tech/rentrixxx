import { supabase } from '@/integrations/supabase/client';
import type { Payment } from '@/types/domain';

export type PaymentPayload = { invoice_id: string; amount: number; method: Payment['payment_method']; date: string; reference: string | null };

export async function postReceiptAtomic(payload: PaymentPayload): Promise<void> {
  const { error } = await supabase.rpc('post_receipt_atomic', payload);
  if (error) throw error;
}
