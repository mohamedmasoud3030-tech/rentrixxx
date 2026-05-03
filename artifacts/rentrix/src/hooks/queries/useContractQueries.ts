import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFetchAll, useDataMutation } from './useDataQueries';
import { apiGet } from '@/services/api/apiClient';

export interface Contract {
  id: string;
  unitId?: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: string;
}

/**
 * Hook for managing contracts.
 * Reads go through the Express API layer (/api/contracts).
 */
export function useContracts() {
  const queryClient = useQueryClient();
  const query = useFetchAll<Contract>('contracts', 1000 * 60 * 2);
  const baseMutations = useDataMutation<Contract>('contracts');

  const extendedMutations = {
    ...baseMutations,
    create: baseMutations.create
  };

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    ...extendedMutations
  };
}

/**
 * Hook for active contracts linked to a specific unit.
 * Fetches all contracts from the API layer and filters client-side by unitId.
 */
export function usePropertyContracts(unitId: string | undefined) {
  return useQuery<Contract[]>({
    queryKey: ['contracts', 'unit', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const result = await apiGet<{ data: Contract[] }>('/api/contracts');
      return result.data.filter(c => c.unitId === unitId);
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 5,
  });
}
