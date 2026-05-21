import { supabase } from '@/integrations/supabase/client';
import { postReceiptAtomic as postReceiptAtomicService, type PaymentPayload } from '@/services/financial/paymentService';

export type { PaymentPayload };

export async function postReceiptAtomic(payload: PaymentPayload): Promise<string> {
  return postReceiptAtomicService(supabase, payload);
}
