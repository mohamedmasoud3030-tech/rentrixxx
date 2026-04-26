import { useState, useEffect } from 'react';
import { ReceiptService, type Receipt } from './receiptService';
import { AppError } from '@/services/utils/errorHandler';

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ReceiptService.list();
      setReceipts(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل سندات القبض'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  return {
    receipts,
    loading,
    error: error?.message || null,
    refetch: fetchReceipts,
    create: async (receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newReceipt = await ReceiptService.create(receipt);
      setReceipts(prev => [newReceipt, ...prev]);
      return newReceipt;
    },
    post: async (id: string) => {
      const posted = await ReceiptService.post(id);
      setReceipts(prev => prev.map(r => r.id === id ? posted : r));
      return posted;
    },
    void: async (id: string) => {
      const voided = await ReceiptService.void(id);
      setReceipts(prev => prev.map(r => r.id === id ? voided : r));
      return voided;
    },
  };
};
