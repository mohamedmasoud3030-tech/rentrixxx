import { useCallback } from 'react';
import type { Contract, Invoice, Settings } from '../types';
import { computeLateFeeAmount, deriveArrearsForOwner, deriveInvoiceStatus } from '../services/financeService';

export interface UseFinanceResult {
  computeLateFeesForContract: (contract: Contract) => number;
  deriveArrearsForOwner: (ownerContractIds: string[]) => number;
  getInvoiceStatus: (invoice: Invoice) => Invoice['status'];
}

export const useFinance = (settings: Settings | null, invoices: Invoice[] = [], contracts: Contract[] = []): UseFinanceResult => {
  const computeLateFeesForContract = useCallback((contract: Contract) => {
    const lateFeeConfig = settings?.operational.lateFee;
    if (!lateFeeConfig) return 0;
    return computeLateFeeAmount(contract.rent, lateFeeConfig);
  }, [settings]);

  const deriveOwnerArrears = useCallback((ownerContractIds: string[]) => {
    return deriveArrearsForOwner(contracts, invoices, ownerContractIds);
  }, [contracts, invoices]);

  const getInvoiceStatus = useCallback((invoice: Invoice) => deriveInvoiceStatus(invoice, settings), [settings]);

  return { computeLateFeesForContract, deriveArrearsForOwner: deriveOwnerArrears, getInvoiceStatus };
};
