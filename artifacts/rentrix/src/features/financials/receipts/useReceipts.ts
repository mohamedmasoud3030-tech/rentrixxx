import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getReceiptDetail, listReceipts, type ReceiptListParams } from '@/services/financial/receiptService';

export const receiptKeys = {
  all: ['receipts'] as const,
  list: (params: ReceiptListParams = {}) => [...receiptKeys.all, 'list', params] as const,
  detail: (receiptOrPaymentId: string) => [...receiptKeys.all, 'detail', receiptOrPaymentId] as const,
};

export function useReceipts(params: ReceiptListParams = {}) {
  return useQuery({ queryKey: receiptKeys.list(params), queryFn: () => listReceipts(supabase, params) });
}

export function useReceipt(receiptOrPaymentId: string) {
  return useQuery({
    queryKey: receiptKeys.detail(receiptOrPaymentId),
    queryFn: () => getReceiptDetail(supabase, receiptOrPaymentId),
    enabled: Boolean(receiptOrPaymentId),
  });
}
