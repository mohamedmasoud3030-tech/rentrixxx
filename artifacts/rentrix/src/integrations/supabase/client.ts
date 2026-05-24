import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';

if (!env.isConfigured) {
  console.error('Supabase environment is incomplete. Runtime diagnostics will be shown in UI.');
}

const missingConfigErrorMessage =
  env.missingSupabaseConfigMessage ??
  'Supabase runtime config is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

const throwMissingConfigError = () => {
  throw new Error(missingConfigErrorMessage);
};

const unconfiguredSupabaseClient = {
  auth: {
    getSession: throwMissingConfigError,
    onAuthStateChange: throwMissingConfigError,
    signInWithPassword: throwMissingConfigError,
    signUp: throwMissingConfigError,
    signOut: throwMissingConfigError,
  },
  from: throwMissingConfigError,
  rpc: throwMissingConfigError,
  channel: throwMissingConfigError,
  removeChannel: throwMissingConfigError,
  removeAllChannels: throwMissingConfigError,
  storage: {
    from: throwMissingConfigError,
  },
  functions: {
    invoke: throwMissingConfigError,
  },
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
