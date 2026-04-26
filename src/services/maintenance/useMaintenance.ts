import { useState, useEffect } from 'react';
import { MaintenanceService, type MaintenanceRecord } from './maintenanceService';
import { AppError } from '@/services/utils/errorHandler';

export const useMaintenance = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MaintenanceService.list();
      setRecords(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل سجلات الصيانة'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error: error?.message || null,
    refetch: fetchRecords,
    create: async (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newRecord = await MaintenanceService.create(record);
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    },
    update: async (id: string, updates: Partial<MaintenanceRecord>) => {
      const updated = await MaintenanceService.update(id, updates);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    },
    complete: async (id: string) => {
      const completed = await MaintenanceService.complete(id);
      setRecords(prev => prev.map(r => r.id === id ? completed : r));
      return completed;
    },
    cancel: async (id: string) => {
      const cancelled = await MaintenanceService.cancel(id);
      setRecords(prev => prev.map(r => r.id === id ? cancelled : r));
      return cancelled;
    },
  };
};
