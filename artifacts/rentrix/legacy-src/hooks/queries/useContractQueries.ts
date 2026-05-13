import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/api/supabaseClient';

export interface Contract {
  id: string;
  unit_id: string;
  tenant_id: string;
  rent: number;
  start: string;
  end: string;
  status: 'active' | 'terminated' | 'expired';
}

export function useContractQueries() {
  return {
    fetchContracts: useQuery({
      queryKey: ['contracts'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*');
        
        if (error) throw error;
        return data || [];
      },
    }),
  };
}
