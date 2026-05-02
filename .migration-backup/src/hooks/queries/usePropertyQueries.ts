import { useQuery } from '@tanstack/react-query';
import { useFetchAll, useDataMutation } from './useDataQueries';
import { supabaseData } from '@/services/supabaseDataService';

export interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  status?: string;
  // Add other relevant fields
}

/**
 * Hook for managing properties with optimized caching
 */
export function useProperties() {
  const query = useFetchAll<Property>('properties', 1000 * 60 * 10); // 10 mins stale time for properties
  const mutations = useDataMutation<Property>('properties');

  return {
    properties: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    ...mutations
  };
}

/**
 * Specialized hook for property stats or dashboard data
 */
export function usePropertyStats() {
  return useQuery({
    queryKey: ['properties', 'stats'],
    queryFn: async () => {
      const data = await supabaseData.fetchAll<Property>('properties');
      return {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        // Add more complex logic as needed
      };
    },
    staleTime: 1000 * 60 * 15, // Stats can be more stale
  });
}
