import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { archiveCommission, createCommission, listCommissions, updateCommission } from './services/commissions-service';
import type { CommissionFilters, CommissionFormValues } from './types';

export const commissionKeys = { all: ['commissions'] as const, list: (filters: CommissionFilters) => [...commissionKeys.all, filters] as const };

export function useCommissions(filters: CommissionFilters) {
  return useQuery({ queryKey: commissionKeys.list(filters), queryFn: () => listCommissions(filters) });
}

export function useSaveCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: CommissionFormValues }) => (id ? updateCommission(id, values) : createCommission(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commissionKeys.all });
      toast.success('تم حفظ العمولة');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر حفظ العمولة'),
  });
}

export function useArchiveCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveCommission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commissionKeys.all });
      toast.success('تم إلغاء العمولة');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إلغاء العمولة'),
  });
}
