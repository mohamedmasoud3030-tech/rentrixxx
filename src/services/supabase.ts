import { createClient } from '@supabase/supabase-js';
import { getAppEnv, maskSecret } from '../config/env';
import { logger } from './logger';

const env = getAppEnv();

logger.info('[Supabase] Initializing client', {
  url: env.supabaseUrl,
  anonKeyMasked: maskSecret(env.supabaseAnonKey),
});

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
