import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoiceKeys } from '../invoices/useInvoices';
import { receiptKeys } from '../receipts/useReceipts';
import { postReceiptAtomic, type PaymentPayload } from './paymentService';

export function usePostPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentPayload) => postReceiptAtomic(payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoice_id) }),
        queryClient.invalidateQueries({ queryKey: receiptKeys.lists() }),
      ]);
      toast.success('تم تسجيل الدفعة بنجاح');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الدفعة'),
  });
}
