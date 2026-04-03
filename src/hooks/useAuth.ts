import { useCallback, useMemo, useState } from 'react';
import type { User } from '../types';
import { canUserAccess, mapProfileToUser, mustChangePassword, resolveRole, type ProfileLike, type SupabaseSessionLike } from '../services/authService';

export interface UseAuthResult {
  user: User | null;
  role: User['role'] | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (session: SupabaseSessionLike, profile: ProfileLike) => void;
  logout: () => void;
  changePassword: () => void;
  canAccess: (action: string) => boolean;
}

export const useAuth = (initialUser: User | null = null): UseAuthResult => {
  const [user, setUser] = useState<User | null>(initialUser);

  const login = useCallback((session: SupabaseSessionLike, profile: ProfileLike) => {
    setUser(mapProfileToUser(session, profile));
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const changePassword = useCallback(() => {
    setUser(prev => (prev ? { ...prev, mustChange: false } : prev));
  }, []);

  const role = useMemo(() => (user ? resolveRole({ role: user.role }) : null), [user]);
  const isAuthenticated = Boolean(user);
  const needsPasswordChange = useMemo(() => mustChangePassword({ must_change_password: user?.mustChange }), [user?.mustChange]);
  const canAccess = useCallback((action: string) => canUserAccess(user, action), [user]);

  return { user, role, isAuthenticated, mustChangePassword: needsPasswordChange, login, logout, changePassword, canAccess };
};
