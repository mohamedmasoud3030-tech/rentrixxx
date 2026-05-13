import { supabase } from '@/integrations/supabase/client';
import type { Invoice, Payment } from '@/types/domain';

export type InvoiceStatusFilter = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'all';
export type InvoiceListItem = Invoice & { contracts: { id: string; property_id: string; tenant_id: string } | null };
export type InvoiceDetail = InvoiceListItem & { payments: Payment[] };
const invoiceSelect = '*, contracts:contract_id(id,property_id,tenant_id)';

export async function listInvoices(status: InvoiceStatusFilter): Promise<InvoiceListItem[]> {
  let query = supabase.from('invoices').select(invoiceSelect).is('deleted_at', null).order('due_date', { ascending: false });
  if (status === 'unpaid') query = query.eq('status', 'issued').eq('paid_amount', 0);
  if (status === 'partial') query = query.eq('status', 'partial');
  if (status === 'paid') query = query.eq('status', 'paid');
  if (status === 'overdue') query = query.eq('status', 'overdue');
  const { data, error } = await query.returns<InvoiceListItem[]>();
  if (error) throw error;
  return data ?? [];
}
export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).is('deleted_at', null).single().returns<InvoiceListItem>();
  if (invoiceError || !invoice) throw invoiceError ?? new Error('Invoice not found');
  const { data: payments, error: paymentsError } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).is('deleted_at', null).order('payment_date', { ascending: false }).returns<Payment[]>();
  if (paymentsError) throw paymentsError;
  return Object.assign(invoice as InvoiceListItem, { payments: payments ?? [] });
}
export async function generateInvoicesFromActiveContracts(): Promise<number> {
  const { data, error } = await supabase.rpc('generate_invoices_from_active_contracts').returns<number>();
  if (error) throw error;
  return data ?? 0;
}
