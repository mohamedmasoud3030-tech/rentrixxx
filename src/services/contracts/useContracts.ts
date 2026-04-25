import { useState, useEffect } from 'react';
import { ContractService, type Contract } from './contractService';

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ContractService.list();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    error,
    refetch: fetchContracts,
    create: async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newContract = await ContractService.create(contract);
      setContracts(prev => [newContract, ...prev]);
      return newContract;
    },
    update: async (id: string, updates: Partial<Contract>) => {
      const updated = await ContractService.update(id, updates);
      setContracts(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    },
    renew: async (id: string, newEndDate: number) => {
      const renewed = await ContractService.renew(id, newEndDate);
      setContracts(prev => prev.map(c => c.id === id ? renewed : c));
      return renewed;
    },
    terminate: async (id: string) => {
      const terminated = await ContractService.terminate(id);
      setContracts(prev => prev.map(c => c.id === id ? terminated : c));
      return terminated;
    },
  };
};
