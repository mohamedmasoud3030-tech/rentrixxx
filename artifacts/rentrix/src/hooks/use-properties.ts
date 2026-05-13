import { useQuery } from '@tanstack/react-query';
import { listProperties } from '@/services/properties-service';

export function useProperties() {
  return useQuery({
    queryKey: ['properties', 'list'],
    queryFn: listProperties,
  });
}
