import { supabase } from '@/integrations/supabase/client';
import {
  formatReceiptNumber,
  getReceiptDetail as getReceiptDetailService,
  listReceipts as listReceiptsService,
  type ReceiptListParams,
  type ReceiptRecord,
} from '@/services/financial/receiptService';

export type { ReceiptListParams, ReceiptRecord };
export { formatReceiptNumber };

export async function listReceipts(params: ReceiptListParams = {}): Promise<ReceiptRecord[]> {
  return listReceiptsService(supabase, params);
}

export async function getReceiptDetail(receiptOrPaymentId: string): Promise<ReceiptRecord> {
  return getReceiptDetailService(supabase, receiptOrPaymentId);
}
