import { supabase } from '@/integrations/supabase/client';
import type { Contract, Expense, Invoice, Payment } from '@/types/domain';
import { getSafeRemainingAmount, sumFinancialValues, toFinancialNumber } from '../financialMath';

export type FinancialReportStatus = Invoice['status'] | 'all';

export type FinancialReportFilters = {
  dateFrom: string;
  dateTo: string;
  propertyId?: string;
  tenantId?: string;
  contractId?: string;
  status?: FinancialReportStatus;
};

export type InvoiceTotalsReport = {
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  invoicesCount: number;
};

export type PaymentTotalsReport = {
  totalPaid: number;
  paymentsCount: number;
};

export type ExpenseTotalsReport = {
  totalExpenses: number;
  expensesCount: number;
};

export type OutstandingBalanceReport = {
  totalOutstanding: number;
  invoicesCount: number;
};

export type CollectionSummaryReport = {
  invoiced: number;
  paid: number;
  outstanding: number;
  receiptsCount: number;
  invoicesCount: number;
  expensesTotal: number;
};

type ContractContext = Pick<Contract, 'id' | 'property_id' | 'tenant_id'>;
type InvoiceReportRow = Pick<Invoice, 'id' | 'contract_id' | 'issue_date' | 'due_date' | 'amount' | 'paid_amount' | 'status' | 'deleted_at'> & {
  contracts?: ContractContext | null;
};
type PaymentReportRow = Pick<Payment, 'id' | 'invoice_id' | 'amount' | 'payment_date' | 'deleted_at'>;
type ExpenseReportRow = Pick<Expense, 'id' | 'property_id' | 'amount' | 'expense_date' | 'deleted_at'>;

type PaymentWithInvoiceContext = PaymentReportRow & {
  invoice: Pick<InvoiceReportRow, 'id' | 'contract_id'> | null;
  contract: ContractContext | null;
};

// Foundation note: report loaders below intentionally use bounded, batched
// current-app hydration. Base invoice/payment/expense queries are constrained by
// required date filters first, then related invoices/contracts are fetched by
// grouped id lists to avoid N+1 requests. This keeps PR #453 merge-safe while
// schema relationships settle; these loaders can later move behind Supabase
// views/RPCs or typed nested relational selects once those relationships are
// confirmed.
const invoiceReportSelect = 'id, contract_id, issue_date, due_date, amount, paid_amount, status, deleted_at, contracts:contract_id(id, property_id, tenant_id)';
const paymentReportSelect = 'id, invoice_id, amount, payment_date, deleted_at';
const expenseReportSelect = 'id, property_id, amount, expense_date, deleted_at';

function hasStatusFilter(status: FinancialReportFilters['status']): status is Invoice['status'] {
  return Boolean(status && status !== 'all');
}

function isWithinDateRange(value: string | null | undefined, filters: Pick<FinancialReportFilters, 'dateFrom' | 'dateTo'>) {
  if (!value) return false;
  return value >= filters.dateFrom && value <= filters.dateTo;
}

function matchesInvoiceContext(invoice: Pick<InvoiceReportRow, 'contract_id' | 'contracts'>, filters: FinancialReportFilters) {
  if (filters.contractId && invoice.contract_id !== filters.contractId) return false;
  if (filters.propertyId && invoice.contracts?.property_id !== filters.propertyId) return false;
  if (filters.tenantId && invoice.contracts?.tenant_id !== filters.tenantId) return false;
  return true;
}

function matchesPaymentContext(payment: PaymentWithInvoiceContext, filters: FinancialReportFilters) {
  if (filters.contractId && payment.invoice?.contract_id !== filters.contractId) return false;
  if (filters.propertyId && payment.contract?.property_id !== filters.propertyId) return false;
  if (filters.tenantId && payment.contract?.tenant_id !== filters.tenantId) return false;
  return true;
}

export function filterInvoicesForReport(invoices: InvoiceReportRow[], filters: FinancialReportFilters) {
  return invoices.filter((invoice) => {
    // These guards duplicate the Supabase filters on purpose for direct helper
    // callers/tests and as a defensive boundary around manually hydrated rows.
    if (invoice.deleted_at) return false;
    if (!isWithinDateRange(invoice.issue_date, filters)) return false;
    if (hasStatusFilter(filters.status) && invoice.status !== filters.status) return false;
    return matchesInvoiceContext(invoice, filters);
  });
}

export function summarizeInvoiceTotals(invoices: Pick<InvoiceReportRow, 'amount' | 'paid_amount'>[]): InvoiceTotalsReport {
  return {
    totalAmount: sumFinancialValues(invoices.map((invoice) => invoice.amount)),
    totalPaid: sumFinancialValues(invoices.map((invoice) => invoice.paid_amount)),
    totalOutstanding: sumFinancialValues(invoices.map((invoice) => getSafeRemainingAmount(invoice.amount, invoice.paid_amount))),
    invoicesCount: invoices.length,
  };
}

export function summarizePaymentTotals(payments: Pick<PaymentReportRow, 'amount'>[]): PaymentTotalsReport {
  return {
    totalPaid: sumFinancialValues(payments.map((payment) => payment.amount)),
    paymentsCount: payments.length,
  };
}

export function summarizeExpenseTotals(expenses: Pick<ExpenseReportRow, 'amount'>[]): ExpenseTotalsReport {
  return {
    totalExpenses: sumFinancialValues(expenses.map((expense) => expense.amount)),
    expensesCount: expenses.length,
  };
}

export function summarizeOutstandingBalance(invoices: Pick<InvoiceReportRow, 'amount' | 'paid_amount'>[]): OutstandingBalanceReport {
  const outstandingInvoices = invoices.filter((invoice) => getSafeRemainingAmount(invoice.amount, invoice.paid_amount) > 0);
  return {
    totalOutstanding: sumFinancialValues(outstandingInvoices.map((invoice) => getSafeRemainingAmount(invoice.amount, invoice.paid_amount))),
    invoicesCount: outstandingInvoices.length,
  };
}

export function summarizeCollectionReport(params: {
  invoiceTotals: InvoiceTotalsReport;
  paymentTotals: PaymentTotalsReport;
  outstandingBalance: OutstandingBalanceReport;
  expenseTotals: ExpenseTotalsReport;
}): CollectionSummaryReport {
  return {
    invoiced: toFinancialNumber(params.invoiceTotals.totalAmount),
    paid: toFinancialNumber(params.paymentTotals.totalPaid),
    outstanding: toFinancialNumber(params.outstandingBalance.totalOutstanding),
    receiptsCount: params.paymentTotals.paymentsCount,
    invoicesCount: params.invoiceTotals.invoicesCount,
    expensesTotal: toFinancialNumber(params.expenseTotals.totalExpenses),
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function loadInvoices(filters: FinancialReportFilters): Promise<InvoiceReportRow[]> {
  let query = supabase
    .from('invoices')
    .select(invoiceReportSelect)
    .is('deleted_at', null)
    .gte('issue_date', filters.dateFrom)
    .lte('issue_date', filters.dateTo);

  if (hasStatusFilter(filters.status)) query = query.eq('status', filters.status);
  if (filters.contractId) query = query.eq('contract_id', filters.contractId);

  const { data, error } = await query.returns<InvoiceReportRow[]>();
  if (error) throw error;
  return filterInvoicesForReport(data ?? [], filters);
}

async function loadPaymentContexts(payments: PaymentReportRow[]): Promise<PaymentWithInvoiceContext[]> {
  if (payments.length === 0) return [];

  // Batched hydration only: one invoice lookup for all payment invoice ids, then
  // one contract lookup for all related contract ids. Do not add per-payment
  // queries here.
  const invoiceIds = uniqueStrings(payments.map((payment) => payment.invoice_id));
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, contract_id, deleted_at')
    .in('id', invoiceIds)
    .is('deleted_at', null)
    .returns<Array<Pick<InvoiceReportRow, 'id' | 'contract_id' | 'deleted_at'>>>();
  if (invoicesError) throw invoicesError;

  const invoiceRows = invoices ?? [];
  const contractIds = uniqueStrings(invoiceRows.map((invoice) => invoice.contract_id));
  const { data: contracts, error: contractsError } = contractIds.length > 0
    ? await supabase
      .from('contracts')
      .select('id, property_id, tenant_id')
      .in('id', contractIds)
      .is('deleted_at', null)
      .returns<ContractContext[]>()
    : { data: [], error: null };
  if (contractsError) throw contractsError;

  const invoiceById = new Map(invoiceRows.map((invoice) => [invoice.id, invoice]));
  const contractById = new Map((contracts ?? []).map((contract) => [contract.id, contract]));

  return payments.map((payment) => {
    const invoice = invoiceById.get(payment.invoice_id) ?? null;
    return {
      ...payment,
      invoice,
      contract: invoice?.contract_id ? contractById.get(invoice.contract_id) ?? null : null,
    };
  });
}

async function loadPayments(filters: FinancialReportFilters): Promise<PaymentWithInvoiceContext[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(paymentReportSelect)
    .is('deleted_at', null)
    .gte('payment_date', filters.dateFrom)
    .lte('payment_date', filters.dateTo)
    .returns<PaymentReportRow[]>();
  if (error) throw error;

  const contexts = await loadPaymentContexts(data ?? []);
  return contexts.filter((payment) => matchesPaymentContext(payment, filters));
}

async function loadExpenses(filters: FinancialReportFilters): Promise<ExpenseReportRow[]> {
  let query = supabase
    .from('expenses')
    .select(expenseReportSelect)
    .is('deleted_at', null)
    .gte('expense_date', filters.dateFrom)
    .lte('expense_date', filters.dateTo);

  if (filters.propertyId) query = query.eq('property_id', filters.propertyId);

  const { data, error } = await query.returns<ExpenseReportRow[]>();
  if (error) throw error;

  return data ?? [];
}

export async function getInvoiceTotalsReport(filters: FinancialReportFilters): Promise<InvoiceTotalsReport> {
  const invoices = await loadInvoices(filters);
  return summarizeInvoiceTotals(invoices);
}

export async function getPaymentTotalsReport(filters: FinancialReportFilters): Promise<PaymentTotalsReport> {
  const payments = await loadPayments(filters);
  return summarizePaymentTotals(payments);
}

export async function getExpenseTotalsReport(filters: FinancialReportFilters): Promise<ExpenseTotalsReport> {
  const expenses = await loadExpenses(filters);
  return summarizeExpenseTotals(expenses);
}

export async function getOutstandingBalanceReport(filters: FinancialReportFilters): Promise<OutstandingBalanceReport> {
  const invoices = await loadInvoices(filters);
  return summarizeOutstandingBalance(invoices);
}

export async function getCollectionSummaryReport(filters: FinancialReportFilters): Promise<CollectionSummaryReport> {
  const [invoices, payments, expenses] = await Promise.all([
    loadInvoices(filters),
    loadPayments(filters),
    loadExpenses(filters),
  ]);

  return summarizeCollectionReport({
    invoiceTotals: summarizeInvoiceTotals(invoices),
    // Receipts are currently read-only projections of posted payments, so the
    // collection summary uses payment totals as the canonical receipt total.
    paymentTotals: summarizePaymentTotals(payments),
    outstandingBalance: summarizeOutstandingBalance(invoices),
    expenseTotals: summarizeExpenseTotals(expenses),
  });
}
