import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoiceKeys } from '../invoices/useInvoices';
import { receiptKeys } from '../receipts/useReceipts';
import { postReceiptAtomic, type PaymentPayload } from '@/services/financial/paymentService';
import { supabase } from '@/integrations/supabase/client';

export function usePostPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentPayload) => postReceiptAtomic(supabase, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: receiptKeys.all }),
      ]);
      toast.success('تم تسجيل الدفعة بنجاح');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الدفعة'),
  });
}
