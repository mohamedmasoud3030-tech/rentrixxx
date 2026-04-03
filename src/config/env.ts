const PLACEHOLDER_PATTERNS = [/changeme/i, /your[_-]?key/i, /^test$/i, /^placeholder$/i];

const normalize = (value: string | undefined): string => (value ?? '').trim();

const isPlaceholder = (value: string): boolean => {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value));
};

const assertValidEnv = (name: string, value: string): void => {
  if (!value) {
    throw new Error(`[env] Missing required variable: ${name}`);
  }

  if (isPlaceholder(value)) {
    throw new Error(`[env] Variable ${name} contains placeholder/test value and is not deployment-safe.`);
  }
};

export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  errorTrackerDsn?: string;
  releaseVersion?: string;
};

export const getAppEnv = (): AppEnv => {
  const supabaseUrl = normalize(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const supabaseAnonKey = normalize(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  const logLevel = normalize(import.meta.env.VITE_LOG_LEVEL as string | undefined) as AppEnv['logLevel'];
  const errorTrackerDsn = normalize(import.meta.env.VITE_ERROR_TRACKER_DSN as string | undefined);
  const releaseVersion = normalize(import.meta.env.VITE_RELEASE_VERSION as string | undefined);

  assertValidEnv('VITE_SUPABASE_URL', supabaseUrl);
  assertValidEnv('VITE_SUPABASE_ANON_KEY', supabaseAnonKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    logLevel: logLevel || undefined,
    errorTrackerDsn: errorTrackerDsn || undefined,
    releaseVersion: releaseVersion || undefined,
  };
};

export const maskSecret = (secret: string): string => {
  if (!secret) return '[missing]';
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
};
