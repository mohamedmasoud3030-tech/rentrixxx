import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getAppEnv, maskSecret } from '@/config/env';
import { logger } from '@/services/logger';

let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const env = getAppEnv();

  logger.info("[Supabase] Initializing client", {
    url: env.supabaseUrl,
    anonKeyMasked: maskSecret(env.supabaseAnonKey),
  });

  supabaseInstance = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  },
});
