import { Database } from '../types';

const extractIsoDate = (dateTime?: string): string | null => {
  if (!dateTime) return null;
  const isoDate = dateTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null;
};

const isWithinInclusiveRange = (dateIso: string, fromIso: string, toIso: string): boolean => {
  return dateIso >= fromIso && dateIso <= toIso;
};

export const getPostedReceiptsForDate = (receipts: Database['receipts'], dateIso: string) => {
  return receipts.filter((receipt) => {
    if (receipt.status !== 'POSTED') return false;
    const receiptDate = extractIsoDate(receipt.dateTime);
    return receiptDate === dateIso;
  });
};

export const getPostedExpensesInRange = (
  expenses: Database['expenses'],
  fromIso: string,
  toIso: string,
) => {
  return expenses.filter((expense) => {
    if (expense.status !== 'POSTED') return false;
    const expenseDate = extractIsoDate(expense.dateTime);
    if (!expenseDate) return false;
    return isWithinInclusiveRange(expenseDate, fromIso, toIso);
  });
};

