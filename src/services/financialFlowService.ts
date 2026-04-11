import type { Expense, Invoice, JournalEntry, Receipt } from '@/types';

const uniqById = <T extends { id: string }>(rows: T[]): T[] => {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    if (!map.has(row.id)) map.set(row.id, row);
  });
  return [...map.values()];
};

export const getInvoiceRemaining = (invoice: Invoice): number => {
  const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
  return Math.max(0, total - (invoice.paidAmount || 0));
};

export const getArrearsInvoices = (invoices: Invoice[], asOf = new Date()): Invoice[] =>
  uniqById(invoices).filter(
    (invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate) < asOf,
  );

export const getRevenueFromPaidInvoices = (invoices: Invoice[]): number =>
  uniqById(invoices)
    .filter((invoice) => invoice.status === 'PAID')
    .reduce((sum, invoice) => sum + ((invoice.amount || 0) + (invoice.taxAmount || 0)), 0);

export const getCashInflow = (receipts: Receipt[]): number =>
  uniqById(receipts)
    .filter((receipt) => receipt.status === 'POSTED')
    .reduce((sum, receipt) => sum + receipt.amount, 0);

export const getExpenseImpact = (expenses: Expense[]): number =>
  uniqById(expenses)
    .filter((expense) => expense.status === 'POSTED')
    .reduce((sum, expense) => sum + Math.abs(expense.amount), 0);

export const getArrearsAmount = (invoices: Invoice[], asOf = new Date()): number =>
  getArrearsInvoices(invoices, asOf).reduce((sum, invoice) => sum + getInvoiceRemaining(invoice), 0);

export const getStableLedgerEntries = (entries: JournalEntry[]): JournalEntry[] =>
  uniqById(entries).sort((a, b) => {
    const tsDiff = (a.createdAt || 0) - (b.createdAt || 0);
    if (tsDiff !== 0) return tsDiff;
    return a.id.localeCompare(b.id);
  });
