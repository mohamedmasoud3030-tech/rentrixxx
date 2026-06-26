const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

const PLACEHOLDER_URLS = [
  'https://example.supabase.co',
  'https://invalid.supabase.local',
];

const PLACEHOLDER_KEYS = ['test-anon-key', 'invalid-anon-key'];

function isValidUrl(url: string): boolean {
  return url.length > 0 && !PLACEHOLDER_URLS.includes(url);
}

function isValidKey(key: string): boolean {
  return key.length > 0 && !PLACEHOLDER_KEYS.includes(key);
}

const isConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);

export const env = {
  supabaseUrl: isConfigured ? supabaseUrl : 'https://invalid.supabase.local',
  supabaseAnonKey: isConfigured ? supabaseAnonKey : 'invalid-anon-key',
  isConfigured,
} as const;
