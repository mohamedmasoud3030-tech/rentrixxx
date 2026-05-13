import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/services/api/supabaseClient';
import { authFacade } from '@/domain/auth/auth.facade';

export const useAuthHook = (
  refreshData: () => Promise<void>,
  audit: (action: string, table: string, id: string, details?: string) => Promise<void>
) => {
  const disableUser = useCallback(async (userId: string) => {
    const facadeDisable = await authFacade.disableUser(userId);
    if (facadeDisable) return facadeDisable;
    
    await supabase.from('profiles').update({ is_disabled: true }).eq('id', userId);
    await audit('DISABLE_USER', 'users', userId);
    await refreshData();
    toast.success('تم تعطيل المستخدم. سيُحظر عند انتهاء جلسته أو تحديث التوكن.');
  }, [audit, refreshData]);

  const enableUser = useCallback(async (userId: string) => {
    const facadeEnable = await authFacade.enableUser(userId);
    if (facadeEnable) return facadeEnable;
    
    await supabase.from('profiles').update({ is_disabled: false }).eq('id', userId);
    await audit('ENABLE_USER', 'users', userId);
    await refreshData();
    toast.success('تم تفعيل المستخدم بنجاح.');
  }, [audit, refreshData]);

  return {
    disableUser,
    enableUser,
  };
};
