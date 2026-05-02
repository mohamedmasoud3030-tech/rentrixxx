import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
  || 'https://nnggcnpcuomwfuupupwg.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZ2djbnBjdW9td2Z1dXB1cHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTcyMjQsImV4cCI6MjA4OTM5MzIyNH0.i_3dknmkEjUONYx0bF_6CujPsBKMH4zfrC_qPz-XxZE';

let supabaseInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
