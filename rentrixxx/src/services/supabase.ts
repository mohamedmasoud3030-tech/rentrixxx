import { createClient } from '@supabase/supabase-js';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(envSupabaseUrl && envSupabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error('[Supabase] Missing credentials - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Prevent app bootstrap crash when env vars are missing.
const supabaseUrl = envSupabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envSupabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
