import { supabase } from '@/integrations/supabase/client';
import type { Contract, Invoice, Payment, Person, Property, Unit } from '@/types/domain';

export type ReceiptListParams = { limit?: number };

export type ReceiptRecord = {
  id: string;
  receipt_number: string;
  payment_id: string;
  invoice_id: string | null;
  invoice_status: Invoice['status'] | null;
  contract_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: Payment['payment_method'];
  reference_number: string | null;
  created_at: string;
  status: 'posted';
  tenant_name: string | null;
  unit_number: string | null;
  property_title: string | null;
};

type ReceiptInvoiceContext = Pick<Invoice, 'id' | 'contract_id' | 'status'>;
type ReceiptContractContext = Pick<Contract, 'id' | 'property_id' | 'unit_id' | 'tenant_id'>;
type ReceiptUnitContext = Pick<Unit, 'id' | 'unit_number'>;
type ReceiptPropertyContext = Pick<Property, 'id' | 'title'>;
type ReceiptTenantContext = Pick<Person, 'id' | 'full_name'>;
type LedgerReceiptRow = {
  id: string;
  no: string | null;
  contract_id: string | null;
  date_time: string;
  channel: Payment['payment_method'] | string | null;
  amount: number;
  ref: string | null;
  created_at: string;
  status: string | null;
};
type ReceiptAllocationRow = { invoice_id: string | null };

const DEFAULT_RECEIPT_LIMIT = 25;

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function formatReceiptNumber(paymentId: string) {
  return `REC-${paymentId.slice(0, 8)}`;
}

function toReceiptRecord(
  payment: Payment,
  invoiceById: Map<string, ReceiptInvoiceContext>,
  contractById: Map<string, ReceiptContractContext>,
  unitById: Map<string, ReceiptUnitContext>,
  propertyById: Map<string, ReceiptPropertyContext>,
  tenantById: Map<string, ReceiptTenantContext>,
): ReceiptRecord {
  const invoice = invoiceById.get(payment.invoice_id) ?? null;
  const contract = invoice?.contract_id ? contractById.get(invoice.contract_id) ?? null : null;
  const unit = contract?.unit_id ? unitById.get(contract.unit_id) ?? null : null;
  const property = contract?.property_id ? propertyById.get(contract.property_id) ?? null : null;
  const tenant = contract?.tenant_id ? tenantById.get(contract.tenant_id) ?? null : null;

  return {
    id: payment.id,
    receipt_number: formatReceiptNumber(payment.id),
    payment_id: payment.id,
    invoice_id: payment.invoice_id,
    invoice_status: invoice?.status ?? null,
    contract_id: invoice?.contract_id ?? null,
    payment_date: payment.payment_date,
    amount: payment.amount,
    payment_method: payment.payment_method,
    reference_number: payment.reference_number,
    created_at: payment.created_at,
    status: 'posted',
    tenant_name: tenant?.full_name ?? null,
    unit_number: unit?.unit_number ?? null,
    property_title: property?.title ?? null,
  };
}

async function loadReceiptRecords(payments: Payment[]): Promise<ReceiptRecord[]> {
  if (payments.length === 0) return [];

  const invoiceIds = uniqueStrings(payments.map((payment) => payment.invoice_id));
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, contract_id, status')
    .in('id', invoiceIds)
    .is('deleted_at', null)
    .returns<ReceiptInvoiceContext[]>();
  if (invoicesError) throw invoicesError;

  const invoiceRows = invoices ?? [];
  const contractIds = uniqueStrings(invoiceRows.map((invoice) => invoice.contract_id));
  const { data: contracts, error: contractsError } = contractIds.length > 0
    ? await supabase
      .from('contracts')
      .select('id, property_id, unit_id, tenant_id')
      .in('id', contractIds)
      .is('deleted_at', null)
      .returns<ReceiptContractContext[]>()
    : { data: [], error: null };
  if (contractsError) throw contractsError;

  const contractRows = contracts ?? [];
  const unitIds = uniqueStrings(contractRows.map((contract) => contract.unit_id));
  const propertyIds = uniqueStrings(contractRows.map((contract) => contract.property_id));
  const tenantIds = uniqueStrings(contractRows.map((contract) => contract.tenant_id));

  const [unitsResult, propertiesResult, tenantsResult] = await Promise.all([
    unitIds.length > 0
      ? supabase.from('units').select('id, unit_number').in('id', unitIds).is('deleted_at', null).returns<ReceiptUnitContext[]>()
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length > 0
      ? supabase.from('properties').select('id, title').in('id', propertyIds).is('deleted_at', null).returns<ReceiptPropertyContext[]>()
      : Promise.resolve({ data: [], error: null }),
    tenantIds.length > 0
      ? supabase.from('people').select('id, full_name').in('id', tenantIds).is('deleted_at', null).returns<ReceiptTenantContext[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (propertiesResult.error) throw propertiesResult.error;
  if (tenantsResult.error) throw tenantsResult.error;

  const invoiceById = new Map(invoiceRows.map((invoice) => [invoice.id, invoice]));
  const contractById = new Map(contractRows.map((contract) => [contract.id, contract]));
  const unitById = new Map((unitsResult.data ?? []).map((unit) => [unit.id, unit]));
  const propertyById = new Map((propertiesResult.data ?? []).map((property) => [property.id, property]));
  const tenantById = new Map((tenantsResult.data ?? []).map((tenant) => [tenant.id, tenant]));

  return payments.map((payment) => toReceiptRecord(payment, invoiceById, contractById, unitById, propertyById, tenantById));
}

export async function listReceipts(params: ReceiptListParams = {}): Promise<ReceiptRecord[]> {
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(params.limit ?? DEFAULT_RECEIPT_LIMIT)
    .returns<Payment[]>();
  if (error) throw error;
  return loadReceiptRecords(payments ?? []);
}

export async function getReceiptDetail(receiptOrPaymentId: string): Promise<ReceiptRecord> {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', receiptOrPaymentId)
    .is('deleted_at', null)
    .single()
    .returns<Payment>();
  if (!error && payment) {
    const [receipt] = await loadReceiptRecords([payment]);
    if (!receipt) throw new Error('Receipt not found');
    return receipt;
  }

  const { data: ledgerReceipt, error: receiptError } = await supabase
    .from('receipts')
    .select('id, no, contract_id, date_time, channel, amount, ref, created_at, status')
    .eq('id', receiptOrPaymentId)
    .single()
    .returns<LedgerReceiptRow>();
  if (receiptError || !ledgerReceipt) throw receiptError ?? error ?? new Error('Receipt not found');

  const { data: allocations, error: allocationsError } = await supabase
    .from('receipt_allocations')
    .select('invoice_id')
    .eq('receipt_id', ledgerReceipt.id)
    .limit(1)
    .returns<ReceiptAllocationRow[]>();
  if (allocationsError) throw allocationsError;

  const invoiceId = allocations?.[0]?.invoice_id ?? null;
  const { data: invoices, error: invoicesError } = invoiceId
    ? await supabase.from('invoices').select('id, contract_id, status').eq('id', invoiceId).returns<ReceiptInvoiceContext[]>()
    : { data: [], error: null };
  if (invoicesError) throw invoicesError;

  const invoice = invoices?.[0] ?? null;
  const contractId = ledgerReceipt.contract_id ?? invoice?.contract_id ?? null;
  const { data: contracts, error: contractsError } = contractId
    ? await supabase.from('contracts').select('id, property_id, unit_id, tenant_id').eq('id', contractId).returns<ReceiptContractContext[]>()
    : { data: [], error: null };
  if (contractsError) throw contractsError;

  const contract = contracts?.[0] ?? null;
  const [unitsResult, propertiesResult, tenantsResult] = await Promise.all([
    contract?.unit_id ? supabase.from('units').select('id, unit_number').eq('id', contract.unit_id).returns<ReceiptUnitContext[]>() : Promise.resolve({ data: [], error: null }),
    contract?.property_id ? supabase.from('properties').select('id, title').eq('id', contract.property_id).returns<ReceiptPropertyContext[]>() : Promise.resolve({ data: [], error: null }),
    contract?.tenant_id ? supabase.from('people').select('id, full_name').eq('id', contract.tenant_id).returns<ReceiptTenantContext[]>() : Promise.resolve({ data: [], error: null }),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (propertiesResult.error) throw propertiesResult.error;
  if (tenantsResult.error) throw tenantsResult.error;

  return {
    id: ledgerReceipt.id,
    receipt_number: ledgerReceipt.no ?? formatReceiptNumber(ledgerReceipt.id),
    payment_id: ledgerReceipt.id,
    invoice_id: invoiceId,
    invoice_status: invoice?.status ?? null,
    contract_id: contractId,
    payment_date: ledgerReceipt.date_time.slice(0, 10),
    amount: ledgerReceipt.amount,
    payment_method: (ledgerReceipt.channel ?? 'other') as Payment['payment_method'],
    reference_number: ledgerReceipt.ref,
    created_at: ledgerReceipt.created_at,
    status: 'posted',
    tenant_name: tenantsResult.data?.[0]?.full_name ?? null,
    unit_number: unitsResult.data?.[0]?.unit_number ?? null,
    property_title: propertiesResult.data?.[0]?.title ?? null,
  };
}
