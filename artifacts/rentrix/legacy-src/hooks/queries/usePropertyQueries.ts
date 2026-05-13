import { useQuery } from '@tanstack/react-query';
import { useFetchAll, useDataMutation } from './useDataQueries';
import { apiGet } from '@/services/api/apiClient';

export interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  status?: string;
}

/**
 * Hook for managing properties with optimized caching.
 * Reads go through the Express API layer (/api/properties).
 */
export function useProperties() {
  const query = useFetchAll<Property>('properties', 1000 * 60 * 10);
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
 * Specialized hook for property stats derived from the API-fetched list.
 */
export function usePropertyStats() {
  return useQuery({
    queryKey: ['properties', 'stats'],
    queryFn: async () => {
      const result = await apiGet<{ data: Property[] }>('/api/properties');
      const data = result.data;
      return {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
      };
    },
    staleTime: 1000 * 60 * 15,
  });
}
