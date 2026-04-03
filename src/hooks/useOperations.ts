import { useCallback, useState } from 'react';
import type { Contract, MaintenanceRecord } from '../types';
import { renewContractState, suspendContractState, terminateContractState, transitionMaintenanceStatus } from '../services/operationsService';

export interface UseOperationsResult {
  contracts: Contract[];
  renewContract: (contractId: string, nextEndDate: string) => void;
  suspendContract: (contractId: string) => void;
  terminateContract: (contractId: string, endDate: string) => void;
  updateMaintenanceStatus: (current: MaintenanceRecord['status'], next: MaintenanceRecord['status']) => MaintenanceRecord['status'];
}

export const useOperations = (initial: Contract[] = []): UseOperationsResult => {
  const [contracts, setContracts] = useState<Contract[]>(initial);

  const renewContract = useCallback((contractId: string, nextEndDate: string) => {
    setContracts(prev => prev.map(contract => (contract.id === contractId ? renewContractState(contract, nextEndDate) : contract)));
  }, []);

  const suspendContract = useCallback((contractId: string) => {
    setContracts(prev => prev.map(contract => (contract.id === contractId ? suspendContractState(contract) : contract)));
  }, []);

  const terminateContract = useCallback((contractId: string, endDate: string) => {
    setContracts(prev => prev.map(contract => (contract.id === contractId ? terminateContractState(contract, endDate) : contract)));
  }, []);

  const updateMaintenanceStatus = useCallback((current: MaintenanceRecord['status'], next: MaintenanceRecord['status']) => {
    return transitionMaintenanceStatus(current, next);
  }, []);

  return { contracts, renewContract, suspendContract, terminateContract, updateMaintenanceStatus };
};
