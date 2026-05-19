const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const env = {
  supabaseUrl: supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey: supabaseAnonKey || 'invalid-anon-key',
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;
