import { useState, useEffect } from 'react';
import { FinanceService, type FinancialSummary } from './financeService';
import { AppError } from '@/services/utils/errorHandler';

export const useFinance = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [occupancyRate, setOccupancyRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchFinancialSummary = async (
    startDate?: Date,
    endDate?: Date
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await FinanceService.getFinancialSummary(startDate, endDate);
      setSummary(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل الملخص المالي'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupancyRate = async () => {
    try {
      const rate = await FinanceService.getOccupancyRate();
      setOccupancyRate(rate);
    } catch (err) {
      console.error('فشل تحميل معدل الإشغال', err);
    }
  };

  useEffect(() => {
    fetchFinancialSummary();
    fetchOccupancyRate();
  }, []);

  return {
    summary,
    occupancyRate,
    loading,
    error: error?.message || null,
    refetch: fetchFinancialSummary,
    getInvoiceBalance: FinanceService.getInvoiceBalance,
    postReceipt: FinanceService.postReceipt,
    reconcileLedger: FinanceService.reconcileLedger,
  };
};
