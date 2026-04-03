import type { User } from '../types';
import { ROLE_CAPABILITIES, type AppRole, type Capability } from '../config/rbac';

export interface SupabaseSessionLike {
  user?: {
    id: string;
    email?: string | null;
  } | null;
}

export interface ProfileLike {
  id: string;
  username?: string | null;
  role?: AppRole | null;
  must_change_password?: boolean | null;
  created_at?: number | null;
  is_disabled?: boolean | null;
}

export const canUserAccess = (user: User | null | undefined, action: string): boolean => {
  if (!user) return false;
  return ROLE_CAPABILITIES[user.role]?.has(action as Capability) ?? false;
};

export const isSessionValid = (session: SupabaseSessionLike | null | undefined): boolean => {
  return Boolean(session?.user?.id);
};

export const resolveRole = (profile: Pick<ProfileLike, 'role'> | null | undefined): AppRole => {
  const role = profile?.role;
  return role && role in ROLE_CAPABILITIES ? role : 'USER';
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
