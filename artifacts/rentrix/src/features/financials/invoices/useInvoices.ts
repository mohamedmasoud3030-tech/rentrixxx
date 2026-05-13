import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateInvoicesFromActiveContracts, getInvoiceDetail, listInvoices, type InvoiceStatusFilter } from './invoiceService';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (status: InvoiceStatusFilter) => [...invoiceKeys.all, 'list', status] as const,
  detail: (invoiceId: string) => [...invoiceKeys.all, 'detail', invoiceId] as const,
};

export function useInvoices(status: InvoiceStatusFilter) { return useQuery({ queryKey: invoiceKeys.list(status), queryFn: () => listInvoices(status) }); }
export function useInvoice(invoiceId: string) { return useQuery({ queryKey: invoiceKeys.detail(invoiceId), queryFn: () => getInvoiceDetail(invoiceId), enabled: Boolean(invoiceId) }); }
export function useGenerateInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateInvoicesFromActiveContracts,
    onSuccess: async (count) => { await queryClient.invalidateQueries({ queryKey: invoiceKeys.all }); toast.success(`تم إنشاء ${count} فاتورة`); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الفواتير'),
  });
}
