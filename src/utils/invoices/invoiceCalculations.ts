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
  dueWithGrace.setHours(0, 0, 0, 0);
  dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueWithGrace < today) return 'OVERDUE';
  if (paid > 0.001) return 'PARTIALLY_PAID';

  return 'UNPAID';
};

export const filterInvoiceByStatus = (
  invoices: Invoice[],
  status: 'all' | 'unpaid' | 'overdue' | 'paid',
  getStatus: (inv: Invoice) => 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE',
  graceDays: number = 0
): Invoice[] => {
  return invoices.filter(inv => {
    const effectiveStatus = getStatus(inv);
    if (status === 'unpaid') return ['UNPAID', 'PARTIALLY_PAID'].includes(effectiveStatus);
    if (status === 'overdue') return effectiveStatus === 'OVERDUE';
    if (status === 'paid') return effectiveStatus === 'PAID';
    return true;
  });
};

export const filterInvoiceByType = (
  invoices: Invoice[],
  type: 'all' | 'RENT' | 'LATE_FEE' | 'UTILITY' | 'OTHER'
): Invoice[] => {
  return invoices.filter(inv => {
    if (type === 'all') return true;
    if (type === 'OTHER') return !['RENT', 'LATE_FEE', 'UTILITY'].includes(inv.type);
    return inv.type === type;
  });
};

export const filterInvoiceByDate = (
  invoices: Invoice[],
  dateFrom: string,
  dateTo: string
): Invoice[] => {
  const from = dateFrom.slice(0, 10);
  const to = dateTo.slice(0, 10);

  return invoices.filter((inv) => {
    const dueDate = inv.dueDate.slice(0, 10);
    return (!from || dueDate >= from) && (!to || dueDate <= to);
  });
};

export const filterInvoiceBySearch = (
  invoices: Invoice[],
  search: string,
  contracts: any[],
  tenants: any[]
): Invoice[] => {
  if (!search.trim()) return invoices;
  
  return invoices.filter(inv => {
    const contract = contracts.find(c => c.id === inv.contractId);
    const tenant = contract ? tenants.find(t => t.id === contract.tenantId) : null;
    return inv.no.includes(search) || tenant?.name.includes(search);
  });
};
