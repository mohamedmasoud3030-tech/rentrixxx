import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateInvoicesFromActiveContracts, getInvoiceDetail, listInvoices, type InvoiceListParams, type InvoiceStatusFilter } from '@/services/financial/invoiceService';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoiceStatusFilter | InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
  detail: (invoiceId: string) => [...invoiceKeys.all, 'detail', invoiceId] as const,
};

export function useInvoices(params: InvoiceStatusFilter | InvoiceListParams) {
  return useQuery({ queryKey: invoiceKeys.list(params), queryFn: () => listInvoices(supabase, params) });
}

export function useInvoice(invoiceId: string) {
  return useQuery({ queryKey: invoiceKeys.detail(invoiceId), queryFn: () => getInvoiceDetail(supabase, invoiceId), enabled: Boolean(invoiceId) });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateInvoicesFromActiveContracts(supabase),
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success(`تم إنشاء ${count} فاتورة`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الفواتير'),
  });
}
