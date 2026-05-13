import type { Session } from '@supabase/supabase-js';

export const DEFAULT_REFRESH_THRESHOLD_MS = 60_000;

export const getSessionExpiryMs = (session: Session | null | undefined): number | null => {
  if (!session?.expires_at) return null;
  return session.expires_at * 1000;
};

export const isSessionExpired = (session: Session | null | undefined, now = Date.now()): boolean => {
  const expiryMs = getSessionExpiryMs(session);
  if (!expiryMs) return true;
  return now >= expiryMs;
};

export const shouldRefreshSession = (
  session: Session | null | undefined,
  now = Date.now(),
  refreshThresholdMs = DEFAULT_REFRESH_THRESHOLD_MS,
): boolean => {
  const expiryMs = getSessionExpiryMs(session);
  if (!expiryMs) return false;
  return expiryMs - now <= refreshThresholdMs;
};
