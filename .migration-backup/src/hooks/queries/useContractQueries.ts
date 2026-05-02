import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFetchAll, useDataMutation } from './useDataQueries';
import { supabaseData } from '@/services/supabaseDataService';

export interface Contract {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: string;
}

/**
 * Hook for managing contracts
 */
export function useContracts() {
  const queryClient = useQueryClient();
  const query = useFetchAll<Contract>('contracts', 1000 * 60 * 2); // Contracts are more dynamic (2 mins)
  const baseMutations = useDataMutation<Contract>('contracts');

  // Override or extend mutations if they affect other data (like property status)
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
 * Hook for contracts by property
 */
export function usePropertyContracts(propertyId: string | undefined) {
  return useQuery<Contract[]>({
    queryKey: ['contracts', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      // This is a simplified fetch, ideally we'd have a specialized service method
      const all = await supabaseData.fetchAll<Contract>('contracts');
      return all.filter(c => c.propertyId === propertyId);
    },
    enabled: !!propertyId,
    staleTime: 1000 * 60 * 5,
  });
}
