import { useState, useEffect, useCallback } from 'react';
import { AuthService, type AuthUser } from './authService';
import { AppError } from '@/services/utils/errorHandler';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AuthService.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
    });

    try {
      const { data } = AuthService.onAuthStateChange((authUser) => {
        setUser(authUser);
      });
      return () => { data?.subscription?.unsubscribe?.(); };
    } catch (err) {
      console.error('Auth listener error:', err);
      setLoading(false);
      return undefined;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      await AuthService.login({ email, password });
      return true;
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'فشل تسجيل الدخول');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setUser(null);
    } catch (err) {
      setError(err instanceof AppError ? err.message : 'فشل تسجيل الخروج');
    }
  }, []);

  return { user, loading, error, login, logout };
};
