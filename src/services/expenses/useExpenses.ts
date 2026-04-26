import { useState, useEffect } from 'react';
import { ExpenseService, type Expense } from './expenseService';
import { AppError } from '@/services/utils/errorHandler';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ExpenseService.list();
      setExpenses(data);
    } catch (err) {
      setError(err instanceof AppError ? err : new AppError('UNKNOWN', 'فشل تحميل المصروفات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return {
    expenses,
    loading,
    error: error?.message || null,
    refetch: fetchExpenses,
    create: async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newExpense = await ExpenseService.create(expense);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    },
    post: async (id: string) => {
      const posted = await ExpenseService.post(id);
      setExpenses(prev => prev.map(e => e.id === id ? posted : e));
      return posted;
    },
    void: async (id: string) => {
      const voided = await ExpenseService.void(id);
      setExpenses(prev => prev.map(e => e.id === id ? voided : e));
      return voided;
    },
  };
};
