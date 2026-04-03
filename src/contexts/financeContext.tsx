import { createContext, useContext } from 'react';
import type { AppContextType } from '../types';

export type FinanceContextValue = {
  financeService: AppContextType['financeService'];
  getFinancialSummary: AppContextType['getFinancialSummary'];
  rebuildSnapshotsFromJournal: AppContextType['rebuildSnapshotsFromJournal'];
  ownerBalances: AppContextType['ownerBalances'];
  contractBalances: AppContextType['contractBalances'];
  tenantBalances: AppContextType['tenantBalances'];
};

export const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export const useFinanceContext = (): FinanceContextValue => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within FinanceContext.Provider');
  }
  return context;
};
