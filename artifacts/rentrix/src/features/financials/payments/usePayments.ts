import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoiceKeys } from '../invoices/useInvoices';
import { receiptKeys } from '../receipts/useReceipts';
import { financialReportKeys } from '../reports/useFinancialReports';
import { postReceiptAtomic, type PaymentPayload } from './paymentService';

export function usePostPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentPayload) => postReceiptAtomic(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: receiptKeys.all }),
        queryClient.invalidateQueries({ queryKey: financialReportKeys.all }),
      ]);
      toast.success('تم تسجيل الدفعة بنجاح');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الدفعة'),
  });
}
