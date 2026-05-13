import { supabase } from '@/services/api/supabaseClient';
import { adminCreateUser } from '@/services/edgeFunctions';
import type { AppContextType } from '@/types';

export type AuthFacadeDelegates = {
  login?: AppContextType['auth']['login'];
  logout?: AppContextType['auth']['logout'];
  changePassword?: AppContextType['auth']['changePassword'];
  updateUser?: AppContextType['auth']['updateUser'];
  forcePasswordReset?: AppContextType['auth']['forcePasswordReset'];
  disableUser?: AppContextType['auth']['disableUser'];
  enableUser?: AppContextType['auth']['enableUser'];
};

export const createAuthFacade = (delegates: AuthFacadeDelegates = {}) => ({
  login: (...args: Parameters<NonNullable<AuthFacadeDelegates['login']>>) =>
    delegates.login?.(...args),

  logout: (...args: Parameters<NonNullable<AuthFacadeDelegates['logout']>>) =>
    delegates.logout?.(...args),

  getSession: () => supabase.auth.getSession(),

  changePassword: (...args: Parameters<NonNullable<AuthFacadeDelegates['changePassword']>>) =>
    delegates.changePassword?.(...args),

  updateUser: (...args: Parameters<NonNullable<AuthFacadeDelegates['updateUser']>>) =>
    delegates.updateUser?.(...args),

  forcePasswordReset: (...args: Parameters<NonNullable<AuthFacadeDelegates['forcePasswordReset']>>) =>
    delegates.forcePasswordReset?.(...args),

  disableUser: (...args: Parameters<NonNullable<AuthFacadeDelegates['disableUser']>>) =>
    delegates.disableUser?.(...args),

  enableUser: (...args: Parameters<NonNullable<AuthFacadeDelegates['enableUser']>>) =>
    delegates.enableUser?.(...args),

  adminCreateUser,
});

export const authFacade = createAuthFacade();
