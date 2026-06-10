import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getAuthorizationContextFromSession, type AuthorizationContext } from '@/features/auth/permissions';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentSession, signInWithEmail, signOut } from '@/services/auth-service';
import { router } from '@/app/router';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  authorization: AuthorizationContext | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGIN_PATH = '/login';

function redirectToLogin(): void {
  const currentPath = router.state.location.pathname;
  if (currentPath !== LOGIN_PATH) {
    void router.navigate({ to: LOGIN_PATH, replace: true });
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const stopLoadingIfMounted = () => {
      if (mounted) {
        setIsLoading(false);
      }
    };

    getCurrentSession()
      .then((restoredSession) => {
        if (mounted) {
          setSession(restoredSession);
        }
      })
      .finally(stopLoadingIfMounted);

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) {
        return;
      }

      switch (event) {
        case 'SIGNED_OUT':
          setSession(null);
          redirectToLogin();
          break;
        case 'SIGNED_IN':
        case 'USER_UPDATED':
          setSession(nextSession);
          break;
        default:
          break;
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      authorization: getAuthorizationContextFromSession(session),
      isLoading,
      isAuthenticated: Boolean(session),
      login: async (email, password) => {
        await signInWithEmail(email, password);
        await router.navigate({ to: '/', replace: true });
      },
      logout: async () => {
        await signOut();
        setSession(null);
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
