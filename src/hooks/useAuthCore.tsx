import { useCallback, useState, useEffect } from 'react';
import { User, AppContextType } from '../types';
import { supabase } from '@/services/api/supabaseClient';
import type { ProfileRow } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { validateLoginPayload, validatePasswordStrength, validateRequiredString, sanitizeTextInput, assertNoRoleEscalation } from '../utils/validation';
import { canUserAccess, mapProfileToUser } from '../services/authService';
import { adminCreateUser } from '../services/edgeFunctions';
import { supabaseData } from '../services/supabaseDataService';
import { logger } from '../infrastructure/observability';
import { confirmDialog } from '../components/shared/confirmDialog';
import { createSessionRefreshScheduler } from '@/services/security/sessionManager';

/**
 * useAuthCore Hook
 * 
 * Manages all authentication-related logic including:
 * - User login/logout
 * - Password management
 * - User CRUD operations
 * - Role-based access control
 * - Audit logging for auth events
 */
export const useAuthCore = (onAudit: (action: string, entity: string, entityId: string, note?: string) => Promise<void>) => {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single<ProfileRow>();
          if (profile) {
            if (profile.is_disabled) {
              await supabase.auth.signOut();
              setCurrentUser(null);
              return;
            }
            setCurrentUser(mapProfileToUser(session, profile));
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        logger.error('[useAuthCore] initAuth error', err);
        setCurrentUser(null);
      }
    };

    initAuth();
  }, []);


  const handleInvalidSession = useCallback(async (reason: 'expired' | 'refresh_failed') => {
    logger.warn('[useAuthCore] invalid session detected', { reason });
    await supabase.auth.signOut();
    setCurrentUser(null);
    toast.error('انتهت صلاحية الجلسة أو تعذّر تجديدها. تم تسجيل الخروج بأمان.');
  }, []);

  /**
   * Login user with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      validateLoginPayload(email, password);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, msg: error.message };
      if (!data.user) return { ok: false, msg: 'فشل تسجيل الدخول' };

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single<ProfileRow>();
      if (!profile) {
        const newProfile: ProfileRow = { id: data.user.id, username: email.split('@')[0], role: 'USER', is_disabled: false, must_change_password: false, created_at: Date.now() };
        await supabase.from('profiles').insert(newProfile);
      }
      if (profile?.is_disabled) {
        await supabase.auth.signOut();
        return { ok: false, msg: 'هذا الحساب معطّل. تواصل مع مدير النظام.' };
      }

      const user: User = {
        id: data.user.id,
        username: profile?.username || email.split('@')[0],
        email: data.user.email || '',
        hash: '',
        salt: '',
        role: (profile?.role as 'ADMIN' | 'USER') || 'USER',
        mustChange: profile?.must_change_password || false,
        createdAt: profile?.created_at ? Number(profile.created_at) : Date.now(),
        isDisabled: false,
      };

      setCurrentUser(user);
      await onAudit('LOGIN', 'SESSION', user.id);
      return { ok: true, msg: 'Ok', mustChange: user.mustChange };
    } catch (e: unknown) {
      return { ok: false, msg: e instanceof Error ? e.message : 'حدث خطأ' };
    }
  }, [onAudit]);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    if (currentUser) await onAudit('LOGOUT', 'SESSION', currentUser.id);
    await supabase.auth.signOut();
    setCurrentUser(null);
  }, [currentUser, onAudit]);

  /**
   * Change password for a user
   */
  const changePassword: AppContextType['auth']['changePassword'] = useCallback(async (userId, newPass) => {
    try {
      validatePasswordStrength(newPass);
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) return { ok: false, msg: error.message };

      await supabaseData.update('profiles', userId, { must_change_password: false });
      setCurrentUser(prev => prev ? { ...prev, mustChange: false } : null);
      await onAudit('UPDATE', 'users', userId, 'Password changed');
      return { ok: true };
    } catch (err) {
      logger.error('[useAuthCore] changePassword error', err);
      return { ok: false, msg: err instanceof Error ? err.message : 'حدث خطأ' };
    }
  }, [onAudit]);

  /**
   * Add a new user (admin only)
   */
  const addUser: AppContextType['auth']['addUser'] = useCallback(async (user, pass) => {
    try {
      validateRequiredString(user.username, 'اسم المستخدم');
      validatePasswordStrength(pass);

      const email = (user as User).email || `${user.username}@rentrix.local`;
      const result = await adminCreateUser({ email, password: pass, username: user.username, role: user.role });

      await onAudit('CREATE', 'users', result.id, `Created user ${user.username}`);
      return { ok: true, msg: 'تم إنشاء المستخدم. سيتلقى المستخدم رسالة تأكيد بالبريد الإلكتروني.' };
    } catch (err) {
      logger.error('[useAuthCore] addUser error', err);
      return { ok: false, msg: err instanceof Error ? err.message : 'حدث خطأ' };
    }
  }, [onAudit]);

  /**
   * Update user details
   */
  const updateUser: AppContextType['auth']['updateUser'] = useCallback(async (id, updates) => {
    try {
      const actorRole = currentUser?.role || 'USER';

      if (updates.username) {
        const username = sanitizeTextInput(validateRequiredString(updates.username, 'اسم المستخدم'));
        await supabaseData.update('profiles', id, { username });
      }

      if (updates.role) {
        assertNoRoleEscalation(actorRole, updates.role);
        await supabaseData.update('profiles', id, { role: updates.role });
      }

      await onAudit('UPDATE', 'users', id, 'Updated user details');
    } catch (err) {
      logger.error('[useAuthCore] updateUser error', err);
      throw err;
    }
  }, [currentUser, onAudit]);

  /**
   * Force password reset for a user
   */
  const forcePasswordReset = useCallback(async (userId: string) => {
    try {
      const confirmed = await confirmDialog({
        title: 'تأكيد تصفير كلمة المرور',
        message: 'هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟',
        confirmLabel: 'تأكيد التصفير',
        tone: 'danger',
      });

      if (!confirmed) return;

      await supabaseData.update('profiles', userId, { must_change_password: true });
      await onAudit('FORCE_RESET_PASSWORD', 'users', userId);

      if (currentUser?.id === userId) {
        await supabase.auth.signOut();
      }

      toast.success('تم فرض إعادة تعيين كلمة المرور. سيتطلب تغيير كلمة المرور عند الدخول التالي.');
    } catch (err) {
      logger.error('[useAuthCore] forcePasswordReset error', err);
      toast.error('حدث خطأ أثناء تصفير كلمة المرور');
    }
  }, [currentUser, onAudit]);

  /**
   * Disable a user account
   */
  const disableUser = useCallback(async (userId: string) => {
    try {
      if (currentUser?.id === userId) {
        toast.error('لا يمكنك تعطيل حسابك الخاص.');
        return;
      }

      const confirmed = await confirmDialog({
        title: 'تأكيد تعطيل المستخدم',
        message: 'هل أنت متأكد من تعطيل هذا المستخدم؟ سيتم حظر وصوله عند انتهاء الجلسة الحالية أو تحديثها.',
        confirmLabel: 'تعطيل المستخدم',
        tone: 'danger',
      });

      if (!confirmed) return;

      await supabaseData.update('profiles', userId, { is_disabled: true });
      await onAudit('DISABLE_USER', 'users', userId);
      toast.success('تم تعطيل المستخدم. سيُحظر عند انتهاء جلسته أو تحديث التوكن.');
    } catch (err) {
      logger.error('[useAuthCore] disableUser error', err);
      toast.error('حدث خطأ أثناء تعطيل المستخدم');
    }
  }, [currentUser, onAudit]);

  /**
   * Enable a user account
   */
  const enableUser = useCallback(async (userId: string) => {
    try {
      await supabaseData.update('profiles', userId, { is_disabled: false });
      await onAudit('ENABLE_USER', 'users', userId);
      toast.success('تم تفعيل المستخدم بنجاح.');
    } catch (err) {
      logger.error('[useAuthCore] enableUser error', err);
      toast.error('حدث خطأ أثناء تفعيل المستخدم');
    }
  }, [onAudit]);

  /**
   * Check if current user can access a specific action
   */
  const canAccess = useCallback((action: string) => {
    return canUserAccess(currentUser, action);
  }, [currentUser]);


  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        return;
      }

      if (!session?.user) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single<ProfileRow>();
      if (!profile || profile.is_disabled) {
        await handleInvalidSession('expired');
        return;
      }

      setCurrentUser(mapProfileToUser(session, profile));
    });

    const stopScheduler = createSessionRefreshScheduler(supabase, {
      onInvalidSession: handleInvalidSession,
    });

    return () => {
      subscription.subscription.unsubscribe();
      stopScheduler();
    };
  }, [handleInvalidSession]);

  return {
    currentUser,
    setCurrentUser,
    login,
    logout,
    changePassword,
    addUser,
    updateUser,
    forcePasswordReset,
    disableUser,
    enableUser,
    canAccess,
  };
};
