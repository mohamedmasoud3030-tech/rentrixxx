import { createClient } from '@supabase/supabase-js';
import { getAppEnv, maskSecret } from '../config/env';
import { logger } from './logger';

const FALLBACK_SUPABASE_URL = 'https://invalid.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'invalid-anon-key';

let supabaseUrl = FALLBACK_SUPABASE_URL;
let supabaseAnonKey = FALLBACK_SUPABASE_ANON_KEY;

try {
  const env = getAppEnv();
  supabaseUrl = env.supabaseUrl;
  supabaseAnonKey = env.supabaseAnonKey;
} catch (error) {
  logger.error('[Supabase] Missing/invalid environment configuration. Falling back to disabled client.', error);
}

logger.info('[Supabase] Initializing client', {
  url: supabaseUrl,
  anonKeyMasked: maskSecret(supabaseAnonKey),
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
