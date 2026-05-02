import type { Session, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_REFRESH_THRESHOLD_MS = 60_000;

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

export const sanitizeHtmlInput = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

type InvalidSessionHandler = (reason: 'expired' | 'refresh_failed') => Promise<void>;

export const refreshSessionOrInvalidate = async (
  client: Pick<SupabaseClient, 'auth'>,
  onInvalidSession: InvalidSessionHandler,
): Promise<{ ok: true; session: Session | null } | { ok: false }> => {
  const { data, error } = await client.auth.refreshSession();

  if (error || !data.session) {
    await onInvalidSession('refresh_failed');
    return { ok: false };
  }

  if (isSessionExpired(data.session)) {
    await onInvalidSession('expired');
    return { ok: false };
  }

  return { ok: true, session: data.session };
};

export const createSessionRefreshScheduler = (
  client: Pick<SupabaseClient, 'auth'>,
  options: {
    refreshThresholdMs?: number;
    intervalMs?: number;
    onInvalidSession: InvalidSessionHandler;
  },
) => {
  const intervalMs = options.intervalMs ?? 30_000;
  const refreshThresholdMs = options.refreshThresholdMs ?? DEFAULT_REFRESH_THRESHOLD_MS;

  const tick = async () => {
    const { data } = await client.auth.getSession();
    const session = data.session;

    if (!session) return;

    if (isSessionExpired(session)) {
      await options.onInvalidSession('expired');
      return;
    }

    if (shouldRefreshSession(session, Date.now(), refreshThresholdMs)) {
      await refreshSessionOrInvalidate(client, options.onInvalidSession);
    }
  };

  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();

  return () => window.clearInterval(timer);
};
