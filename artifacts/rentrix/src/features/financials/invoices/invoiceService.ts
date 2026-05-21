import { supabase } from '@/integrations/supabase/client';
import {
  generateInvoicesFromActiveContracts as generateInvoicesFromActiveContractsService,
  getInvoiceDetail as getInvoiceDetailService,
  listInvoices as listInvoicesService,
  summarizeInvoices,
  type InvoiceDetail,
  type InvoiceListItem,
  type InvoiceListParams,
  type InvoiceStatusFilter,
  type InvoiceSummary,
} from '@/services/financial/invoiceService';

export type { InvoiceDetail, InvoiceListItem, InvoiceListParams, InvoiceStatusFilter, InvoiceSummary };
export { summarizeInvoices };

export async function listInvoices(params: InvoiceStatusFilter | InvoiceListParams): Promise<InvoiceListItem[]> {
  return listInvoicesService(supabase, params);
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
  return getInvoiceDetailService(supabase, invoiceId);
}

export async function generateInvoicesFromActiveContracts(): Promise<number> {
  return generateInvoicesFromActiveContractsService(supabase);
}
