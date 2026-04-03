import { useCallback } from 'react';
import type { Invoice, Settings } from '../types';
import { deriveInvoiceStatus, getInvoiceOutstanding, round3, toNumber } from '../services/financeService';

export interface UseFinanceResult {
  round3: (value: number) => number;
  toNumber: (value: unknown) => number;
  deriveInvoiceStatus: (invoice: Invoice) => Invoice['status'];
  getInvoiceOutstanding: (invoice: Invoice) => number;
}

export const useFinance = (settings: Settings | null): UseFinanceResult => {
  const deriveStatus = useCallback((invoice: Invoice) => deriveInvoiceStatus(invoice, settings), [settings]);
  const outstanding = useCallback((invoice: Invoice) => getInvoiceOutstanding(invoice), []);

  return { round3, toNumber, deriveInvoiceStatus: deriveStatus, getInvoiceOutstanding: outstanding };
};
