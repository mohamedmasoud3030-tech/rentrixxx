const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const PLACEHOLDER_URLS = [
  'https://example.supabase.co',
  'https://invalid.supabase.local',
];

const PLACEHOLDER_KEYS = ['test-anon-key', 'invalid-anon-key'];

function isValidUrl(url: string): boolean {
  return url && !PLACEHOLDER_URLS.includes(url);
}

function isValidKey(key: string): boolean {
  return key && !PLACEHOLDER_KEYS.includes(key);
}

export const env = {
  supabaseUrl: supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey: supabaseAnonKey || 'invalid-anon-key',
  isConfigured: isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey),
} as const;
