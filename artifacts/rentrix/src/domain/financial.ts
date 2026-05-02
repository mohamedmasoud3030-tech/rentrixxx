import type { MoneyBalance } from '@/types/domain';

export interface FinancialInvoice {
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
}

export function calculateBalance(debit: number, credit: number): MoneyBalance {
  return {
    debit,
    credit,
    net: debit - credit,
  };
}

export function isInvoiceOverdue(invoice: FinancialInvoice, at = new Date()): boolean {
  if (invoice.status === 'PAID') return false;
  const due = new Date(invoice.dueDate).getTime();
  return Number.isFinite(due) && due < at.getTime() && invoice.amount > invoice.paidAmount;
}
