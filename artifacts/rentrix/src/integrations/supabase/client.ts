import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

if (!env.isConfigured) {
  console.error('Supabase environment is incomplete. Runtime diagnostics will be shown in UI.');
}

const missingConfigErrorMessage =
  env.missingSupabaseConfigMessage ??
  'Supabase runtime config is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

function createThrowingMethod<TArgs extends unknown[], TResult>(methodName: string) {
  return (..._args: TArgs): TResult => {
    throw new Error(`${missingConfigErrorMessage} (attempted to call supabase.${methodName})`);
  };
}

const unconfiguredSupabaseClient = {
  auth: {
    getSession: createThrowingMethod<[], Promise<never>>('auth.getSession'),
    onAuthStateChange: createThrowingMethod<[(_event: string, _session: unknown) => void], { data: { subscription: { unsubscribe: () => void } } }>('auth.onAuthStateChange'),
    signInWithPassword: createThrowingMethod<[unknown], Promise<never>>('auth.signInWithPassword'),
    signOut: createThrowingMethod<[], Promise<never>>('auth.signOut'),
  },
  from: createThrowingMethod<[string], ReturnType<ReturnType<typeof createClient<Database>>['from']>>('from'),
  rpc: createThrowingMethod<[string, unknown?], ReturnType<ReturnType<typeof createClient<Database>>['rpc']>>('rpc'),
} as unknown as ReturnType<typeof createClient<Database>>;

export const supabase = env.isConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'rentrix-auth-session',
      },
    })
  : unconfiguredSupabaseClient;
