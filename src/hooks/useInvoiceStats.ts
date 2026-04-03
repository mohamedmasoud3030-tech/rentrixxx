import { useMemo } from 'react';
import { Invoice, Receipt } from '../types';
import { getEffectiveStatus, getInvoiceRemaining } from '../utils/invoices/invoiceCalculations';
import { InvoiceStats } from '../utils/invoices/types';

export const useInvoiceStats = (
  invoices: Invoice[],
  receipts: Receipt[],
  graceDays: number = 0
): InvoiceStats => {
  return useMemo(() => {
    const unpaid = invoices
      .filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(getEffectiveStatus(i, graceDays)))
      .reduce((sum, i) => sum + getInvoiceRemaining(i), 0);

    const overdue = invoices
      .filter(i => getEffectiveStatus(i, graceDays) === 'OVERDUE')
      .reduce((sum, i) => sum + getInvoiceRemaining(i), 0);

    const month = new Date().toISOString().slice(0, 7);
    const collectedThisMonth = receipts
      .filter(r => r.status === 'POSTED' && r.dateTime.startsWith(month))
      .reduce((sum, r) => sum + r.amount, 0);

    return { unpaid, overdue, collectedThisMonth };
  }, [invoices, receipts, graceDays]);
};
