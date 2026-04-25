import { useState, useEffect } from 'react';
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
        setError(err instanceof Error ? err.message : 'Auth error');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(setUser);
    return () => subscription?.unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
    login: async (email: string, password: string) => {
      try {
        setError(null);
        await AuthService.login({ email, password });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
        return false;
      }
    },
    logout: async () => {
      try {
        setError(null);
        await AuthService.logout();
        setUser(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Logout failed');
      }
    },
    register: async (email: string, password: string) => {
      try {
        setError(null);
        await AuthService.register({ email, password });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
        return false;
      }
    },
  };
};
