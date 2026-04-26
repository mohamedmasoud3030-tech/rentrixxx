import { useState, useEffect, useCallback } from 'react';
import { AuthService, AuthUser } from './authService';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth init error:', err);
        setError(err instanceof Error ? err.message : 'Auth error');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth changes
    try {
      const unsubscribe = AuthService.onAuthStateChange((authUser) => {
        setUser(authUser);
      });
      return () => unsubscribe?.();
    } catch (err) {
      console.error('Auth listener error:', err);
      return undefined;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await AuthService.login({ email, password });
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await AuthService.logout();
      setUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMsg);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await AuthService.register({ email, password });
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMsg);
      return false;
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
  };
};
