import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAppEnv, maskSecret } from '../config/env';
import { logger } from './logger';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const env = getAppEnv();

  logger.info("[Supabase] Initializing client", {
    url: env.supabaseUrl,
    anonKeyMasked: maskSecret(env.supabaseAnonKey),
  });

  supabaseInstance = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  },
});
