import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const supabaseKey = supabasePublishableKey || supabaseAnonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase environment variables. ` +
      `URL: ${supabaseUrl ? '✓' : '✗'}, Key: ${supabaseKey ? '✓' : '✗'}`
    );
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey, {
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
  get: (target, prop: string | symbol) => {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  },
});
