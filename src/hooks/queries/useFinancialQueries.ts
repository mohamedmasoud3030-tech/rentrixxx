import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFetchAll, useDataMutation } from './useDataQueries';
import { supabaseData } from '@/services/supabaseDataService';

export interface Invoice {
  id: string;
  contractId: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
}

export interface Receipt {
  id: string;
  invoiceId?: string;
  amount: number;
  date: string;
  paymentMethod: string;
}

/**
 * Hook for managing invoices
 */
export function useInvoices() {
  const query = useFetchAll<Invoice>('invoices', 1000 * 60 * 5);
  const mutations = useDataMutation<Invoice>('invoices');

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    ...mutations
  };
}

/**
 * Hook for managing receipts
 */
export function useReceipts() {
  const queryClient = useQueryClient();
  const query = useFetchAll<Receipt>('receipts', 1000 * 60 * 5);
  const baseMutations = useDataMutation<Receipt>('receipts');

  // Custom receipt mutation because it affects invoice status
  const addReceipt = useMutation({
    mutationFn: (receipt: Partial<Receipt>) => supabaseData.insert<Receipt>('receipts', receipt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ownerBalances'] });
    }
  });

  return {
    receipts: query.data ?? [],
    isLoading: query.isLoading,
    addReceipt,
    ...baseMutations
  };
}
