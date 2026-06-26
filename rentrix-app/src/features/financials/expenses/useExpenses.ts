import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { financialReportKeys } from '../reports/useFinancialReports';
import { createExpense, listExpenses, updateExpense, type ExpenseFilters, type ExpensePayload } from './expenseService';

export const expenseKeys = { all: ['expenses'] as const, list: (f: ExpenseFilters) => [...expenseKeys.all, f] as const };
export function useExpenses(filters: ExpenseFilters) { return useQuery({ queryKey: expenseKeys.list(filters), queryFn: () => listExpenses(filters) }); }
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ExpensePayload) => createExpense(p),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: expenseKeys.all }),
        qc.invalidateQueries({ queryKey: financialReportKeys.all }),
      ]);
      toast.success('تم إضافة المصروف');
    },
  });
}
export function useUpdateExpense(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ExpensePayload) => updateExpense(id, p),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: expenseKeys.all }),
        qc.invalidateQueries({ queryKey: financialReportKeys.all }),
      ]);
      toast.success('تم تحديث المصروف');
    },
  });
}
