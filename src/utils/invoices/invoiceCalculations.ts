import { Invoice } from '../../types';

export const getInvoiceTotal = (invoice: Invoice): number => {
  return (invoice.amount || 0) + (invoice.taxAmount || 0);
};

export const getInvoiceRemaining = (invoice: Invoice): number => {
  const total = getInvoiceTotal(invoice);
  return Math.max(0, total - (invoice.paidAmount || 0));
};

export const getEffectiveStatus = (
  invoice: Invoice,
  graceDays: number = 0
): 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE' => {
  const total = getInvoiceTotal(invoice);
  const paid = invoice.paidAmount || 0;

  if (paid >= total - 0.001) return 'PAID';

  const dueWithGrace = new Date(invoice.dueDate);
  dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);

  if (dueWithGrace < new Date()) return 'OVERDUE';
  if (paid > 0.001) return 'PARTIALLY_PAID';

  return 'UNPAID';
};

export const filterInvoiceByStatus = (
  invoice: Invoice,
  status: 'all' | 'unpaid' | 'overdue' | 'paid',
  effectiveStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE'
): boolean => {
  if (status === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID'].includes(effectiveStatus);
  if (status === 'overdue') return effectiveStatus === 'OVERDUE';
  if (status === 'paid') return effectiveStatus === 'PAID';
  return true;
};

export const filterInvoiceByType = (
  invoice: Invoice,
  type: 'all' | 'RENT' | 'LATE_FEE' | 'UTILITY' | 'OTHER'
): boolean => {
  if (type === 'all') return true;
  if (type === 'OTHER') return !['RENT', 'LATE_FEE', 'UTILITY'].includes(invoice.type);
  return invoice.type === type;
};

export const filterInvoiceByDate = (
  invoice: Invoice,
  dateFrom: string,
  dateTo: string
): boolean => {
  return (!dateFrom || invoice.dueDate >= dateFrom) && (!dateTo || invoice.dueDate <= dateTo);
};

export const filterInvoiceBySearch = (
  invoice: Invoice,
  search: string,
  tenantName?: string
): boolean => {
  if (!search.trim()) return true;
  return invoice.no.includes(search) || (tenantName && tenantName.includes(search));
};
