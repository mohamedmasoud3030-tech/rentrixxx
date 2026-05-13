import { renewContractAtomic, softDeleteContract } from '@/services/operationsService';
import { mapContractPayload } from '@/mappers/contractMapper';
import type { AppContextType, Contract } from '@/types';

export type OperationsFacadeDelegates = {
  add?: AppContextType['dataService']['add'];
  update?: AppContextType['dataService']['update'];
  remove?: AppContextType['dataService']['remove'];
};

export const createOperationsFacade = (delegates: OperationsFacadeDelegates = {}) => ({
  addContract: (entry: Omit<Contract, 'id' | 'createdAt' | 'no'>) => delegates.add?.('contracts', entry),

  updateContract: (id: string, updates: Record<string, unknown>) => delegates.update?.('contracts', id, updates),

  validateContract: (payload: Omit<Contract, 'id' | 'createdAt' | 'no'>) => mapContractPayload(payload),

  deleteContract: (id: string) => delegates.remove?.('contracts', id),

  renewContractAtomic,

  softDeleteContract,
});

export const operationsFacade = createOperationsFacade();
