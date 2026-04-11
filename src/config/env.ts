const PLACEHOLDER_PATTERNS = [/changeme/i, /your[_-]?key/i, /^test$/i, /^placeholder$/i];

const normalize = (value: string | undefined): string => (value ?? '').trim();

const isPlaceholder = (value: string): boolean => {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
};

const ensureAscii = (value: string): string => value.replace(/[^\x00-\x7F]/g, '');

const readRequired = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string => {
  const raw = normalize(import.meta.env[key] as string | undefined);
  const value = ensureAscii(raw);

  if (!value || isPlaceholder(value)) {
    throw new Error(`[env] ${key} is missing or contains a placeholder value.`);
  }

  return value;
};

export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  errorTrackerDsn?: string;
  releaseVersion?: string;
};

let envCache: AppEnv | null = null;

export const getAppEnv = (): AppEnv => {
  if (envCache) return envCache;

  envCache = {
    supabaseUrl: readRequired('VITE_SUPABASE_URL'),
    supabaseAnonKey: readRequired('VITE_SUPABASE_ANON_KEY'),
    logLevel: normalize(import.meta.env.VITE_LOG_LEVEL as string | undefined) as AppEnv['logLevel'] || undefined,
    errorTrackerDsn: normalize(import.meta.env.VITE_ERROR_TRACKER_DSN as string | undefined) || undefined,
    releaseVersion: normalize(import.meta.env.VITE_RELEASE_VERSION as string | undefined) || undefined,
  };

  return envCache;
};

export const maskSecret = (secret: string): string => {
  if (!secret) return '[missing]';
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
};
