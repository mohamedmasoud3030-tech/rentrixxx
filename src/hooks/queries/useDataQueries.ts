import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseData } from '@/services/supabaseDataService';
import { logger } from '@/services/logger';

/**
 * Generic hook for fetching all records from a table with caching
 */
export function useFetchAll<T>(tableName: string, staleTime = 1000 * 60 * 5) {
  return useQuery<T[]>({
    queryKey: [tableName, 'all'],
    queryFn: () => supabaseData.fetchAll<T>(tableName),
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
    staleTime: 1000 * 60 * 10, // Details are usually less dynamic
  });
}

/**
 * Generic hook for mutations with optimistic updates and cache invalidation
 */
export function useDataMutation<T extends { id?: string | number }>(tableName: string) {
  const queryClient = useQueryClient();

  // Create/Insert mutation
  const createMutation = useMutation({
    mutationFn: (record: Partial<T>) => supabaseData.insert<T>(tableName, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      logger.info(`[Cache] Invalidated ${tableName} after insert`);
    },
  });

  // Update mutation with Optimistic UI support
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string | number, updates: Partial<T> }) => 
      supabaseData.update(tableName, id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: [tableName] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T[]>([tableName, 'all']);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<T[]>([tableName, 'all'], (old) => 
          old?.map(item => item.id === id ? { ...item, ...updates } : item)
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData([tableName, 'all'], context.previousData);
      }
      logger.error(`[Cache] Error updating ${tableName}, rolled back`, err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
  });

  // Delete mutation
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
