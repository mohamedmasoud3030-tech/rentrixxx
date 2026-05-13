import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseData } from '@/services/supabaseDataService';
import { apiGet } from '@/services/api/apiClient';
import { logger } from '@/infrastructure/observability';

const API_TABLES = new Set(['properties', 'units', 'contracts', 'invoices']);

/**
 * Generic hook for fetching all records from a table with caching.
 * Core tables (properties, units, contracts, invoices) are fetched through
 * the Express API layer with a Bearer token; all others go directly to Supabase.
 */
export function useFetchAll<T>(tableName: string, staleTime = 1000 * 60 * 5) {
  return useQuery<T[]>({
    queryKey: [tableName, 'all'],
    queryFn: API_TABLES.has(tableName)
      ? async () => {
          const result = await apiGet<{ data: T[] }>(`/api/${tableName}`);
          return result.data;
        }
      : () => supabaseData.fetchAll<T>(tableName),
    staleTime,
  });
}

/**
 * Generic hook for fetching a single record by ID
 */
export function useFetchOne<T>(tableName: string, id: string | number | undefined) {
  return useQuery<T | null>({
    queryKey: [tableName, 'detail', id],
    queryFn: () => id ? supabaseData.fetchOne<T>(tableName, id) : Promise.resolve(null),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Generic hook for mutations with optimistic updates and cache invalidation
 */
export function useDataMutation<T extends { id?: string | number }>(tableName: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (record: Partial<T>) => supabaseData.insert<T>(tableName, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      logger.info(`[Cache] Invalidated ${tableName} after insert`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string | number, updates: Partial<T> }) =>
      supabaseData.update(tableName, id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: [tableName] });
      const previousData = queryClient.getQueryData<T[]>([tableName, 'all']);
      if (previousData) {
        queryClient.setQueryData<T[]>([tableName, 'all'], (old) =>
          old?.map(item => item.id === id ? { ...item, ...updates } : item)
        );
      }
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([tableName, 'all'], context.previousData);
      }
      logger.error(`[Cache] Error updating ${tableName}, rolled back`, { message: (err as any)?.message, code: (err as any)?.code });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => supabaseData.remove(tableName, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [tableName] });
      const previousData = queryClient.getQueryData<T[]>([tableName, 'all']);
      if (previousData) {
        queryClient.setQueryData<T[]>([tableName, 'all'], (old) =>
          old?.filter(item => item.id !== id)
        );
      }
      return { previousData };
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([tableName, 'all'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
  };
}
