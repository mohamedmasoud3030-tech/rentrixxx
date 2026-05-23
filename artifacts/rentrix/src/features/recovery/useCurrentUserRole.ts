import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

export function useCurrentUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['auth', 'current-user-role', user?.id ?? null],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data?.role?.toUpperCase() ?? null;
    },
  });
}
