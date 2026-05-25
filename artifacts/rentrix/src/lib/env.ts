const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const missingSupabaseConfig = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean) as string[];

const missingSupabaseConfigMessage = missingSupabaseConfig.length
  ? `Missing Supabase runtime config: ${missingSupabaseConfig.join(', ')}`
  : null;

if (missingSupabaseConfigMessage) {
  console.error(missingSupabaseConfigMessage);
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isConfigured: missingSupabaseConfig.length === 0,
  missingSupabaseConfig,
  missingSupabaseConfigMessage,
} as const;
