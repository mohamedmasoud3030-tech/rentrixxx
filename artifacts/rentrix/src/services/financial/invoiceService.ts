import type { SupabaseClient } from '@supabase/supabase-js';
import type { Invoice, Payment } from '@/types/domain';
import { getSafeRemainingAmount, toFinancialNumber } from '@/features/financials/financialMath';
import { getPaginationRange } from '@/lib/pagination';

export type InvoiceStatusFilter = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'all';
export type InvoiceListItem = Invoice & { contracts: { id: string; property_id: string; tenant_id: string } | null };
export type InvoiceDetail = InvoiceListItem & { payments: Payment[] };
export type InvoiceListParams = { status: InvoiceStatusFilter; search?: string; page?: number; pageSize?: number };
export type InvoiceSummary = { totalAmount: number; totalPaid: number; totalRemaining: number; count: number };

const invoiceSelect = '*, contracts:contract_id(id,property_id,tenant_id)';

function applyStatusFilter(query: any, status: InvoiceStatusFilter) {
  if (status === 'unpaid') return query.eq('status', 'issued').eq('paid_amount', 0);
  if (status === 'partial') return query.eq('status', 'partial');
  if (status === 'paid') return query.eq('status', 'paid');
  if (status === 'overdue') return query.eq('status', 'overdue');
  return query;
}

export function summarizeInvoices(invoices: Pick<Invoice, 'amount' | 'paid_amount'>[]): InvoiceSummary {
  return invoices.reduce(
    (summary, invoice) => {
      summary.totalAmount += toFinancialNumber(invoice.amount);
      summary.totalPaid += toFinancialNumber(invoice.paid_amount);
      summary.totalRemaining += getSafeRemainingAmount(invoice.amount, invoice.paid_amount);
      summary.count += 1;
      return summary;
    },
    { totalAmount: 0, totalPaid: 0, totalRemaining: 0, count: 0 },
  );
}

export async function listInvoices(supabase: SupabaseClient, params: InvoiceStatusFilter | InvoiceListParams): Promise<InvoiceListItem[]> {
  const status = typeof params === 'string' ? params : params.status;
  const search = typeof params === 'string' ? '' : params.search?.trim() ?? '';
  const page = typeof params === 'string' ? 1 : params.page ?? 1;
  const pageSize = typeof params === 'string' ? 20 : params.pageSize ?? 20;
  const { from, to } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('invoices')
    .select(invoiceSelect, { count: 'exact' })
    .is('deleted_at', null)
    .order('due_date', { ascending: false })
    .range(from, to);

  query = applyStatusFilter(query, status);

  if (search) {
    const escaped = search.replaceAll('%', '\\%').replaceAll('_', '\\_');
    const term = `"%${escaped}%"`;
    query = query.or(`id.ilike.${term},status.ilike.${term}`);
  }

  const { data, error } = await query.returns<InvoiceListItem[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getInvoiceDetail(supabase: SupabaseClient, invoiceId: string): Promise<InvoiceDetail> {
  const { data: invoice, error: invoiceError } = await supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).is('deleted_at', null).single().returns<InvoiceListItem>();
  if (invoiceError || !invoice) throw invoiceError ?? new Error('Invoice not found');
  const { data: payments, error: paymentsError } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).is('deleted_at', null).order('payment_date', { ascending: false }).returns<Payment[]>();
  if (paymentsError) throw paymentsError;
  return Object.assign(invoice as InvoiceListItem, { payments: payments ?? [] });
}

export async function generateInvoicesFromActiveContracts(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('generate_invoices_from_active_contracts').single().returns<number>();
  if (error) throw error;
  return data ?? 0;
}