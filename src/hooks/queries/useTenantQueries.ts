import { useFetchAll, useDataMutation } from './useDataQueries';

export interface Tenant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  civilId?: string;
  status?: string;
}

/**
 * Hook for managing tenants
 */
export function useTenants() {
  const query = useFetchAll<Tenant>('tenants', 1000 * 60 * 10);
  const mutations = useDataMutation<Tenant>('tenants');

  return {
    tenants: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    ...mutations
  };
}
