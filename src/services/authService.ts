import type { User } from '../types';

const CAPABILITY_MAP: Record<'ADMIN' | 'USER', Set<string>> = {
  ADMIN: new Set([
    'VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'VIEW_AUDIT_LOG', 'USE_SMART_ASSISTANT',
    'MANAGE_PROPERTIES', 'MANAGE_TENANTS', 'MANAGE_OWNERS', 'MANAGE_CONTRACTS', 'MANAGE_MAINTENANCE', 'VIEW_REPORTS',
  ]),
  USER: new Set([
    'VIEW_DASHBOARD', 'VIEW_FINANCIALS', 'USE_SMART_ASSISTANT',
    'MANAGE_PROPERTIES', 'MANAGE_TENANTS', 'MANAGE_OWNERS', 'MANAGE_CONTRACTS', 'MANAGE_MAINTENANCE', 'VIEW_REPORTS',
  ]),
};

export interface SupabaseSessionLike {
  user?: {
    id: string;
    email?: string | null;
  } | null;
}

export interface ProfileLike {
  id: string;
  username?: string | null;
  role?: 'ADMIN' | 'USER' | null;
  must_change_password?: boolean | null;
  created_at?: number | null;
  is_disabled?: boolean | null;
}

export const canUserAccess = (user: User | null | undefined, action: string): boolean => {
  if (!user) return false;
  return CAPABILITY_MAP[user.role]?.has(action) ?? false;
};

export const isSessionValid = (session: SupabaseSessionLike | null | undefined): boolean => {
  return Boolean(session?.user?.id);
};

export const resolveRole = (profile: Pick<ProfileLike, 'role'> | null | undefined): 'ADMIN' | 'USER' => {
  return profile?.role === 'ADMIN' ? 'ADMIN' : 'USER';
};

export const mustChangePassword = (profile: Pick<ProfileLike, 'must_change_password'> | null | undefined): boolean => {
  return Boolean(profile?.must_change_password);
};

export const mapProfileToUser = (session: SupabaseSessionLike, profile: ProfileLike): User => ({
  id: session.user?.id ?? profile.id,
  username: profile.username || session.user?.email?.split('@')[0] || 'user',
  email: session.user?.email || '',
  hash: '',
  salt: '',
  role: resolveRole(profile),
  mustChange: mustChangePassword(profile),
  createdAt: profile.created_at || Date.now(),
  isDisabled: Boolean(profile.is_disabled),
});
