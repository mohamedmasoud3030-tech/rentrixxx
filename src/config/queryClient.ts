import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/services/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default stale time
      gcTime: 1000 * 60 * 30, // 30 minutes cache time
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or other client errors that won't resolve with retry
        if (error?.code === 'PGRST116' || error?.status === 404) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        logger.error('[QueryClient] Mutation error:', error);
      },
    },
  },
});
