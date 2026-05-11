import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getAppEnv } from '@/config/env';

let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) return supabaseInstance;

  const env = getAppEnv();

  supabaseInstance = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: { schema: 'public' },
  });

  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop: string | symbol) => {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  },
});
