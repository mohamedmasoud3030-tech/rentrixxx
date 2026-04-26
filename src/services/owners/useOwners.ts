import { useState, useEffect } from 'react';
import { OwnerService, type Owner } from './ownerService';
import { AppError } from '@/services/utils/errorHandler';

export const useOwners = () => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OwnerService.list();
      setOwners(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل الملاك'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  return {
    owners,
    loading,
    error: error?.message || null,
    refetch: fetchOwners,
    create: async (owner: Omit<Owner, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newOwner = await OwnerService.create(owner);
      setOwners(prev => [newOwner, ...prev]);
      return newOwner;
    },
    update: async (id: string, updates: Partial<Owner>) => {
      const updated = await OwnerService.update(id, updates);
      setOwners(prev => prev.map(o => o.id === id ? updated : o));
      return updated;
    },
    delete: async (id: string) => {
      await OwnerService.delete(id);
      setOwners(prev => prev.filter(o => o.id !== id));
    },
  };
};
