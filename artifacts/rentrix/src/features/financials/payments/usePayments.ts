import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoiceKeys } from '../invoices/useInvoices';
import { postReceiptAtomic, type PaymentPayload } from './paymentService';

export function usePostPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentPayload) => postReceiptAtomic(payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: invoiceKeys.all }); toast.success('تم تسجيل الدفعة بنجاح'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الدفعة'),
  });
}
