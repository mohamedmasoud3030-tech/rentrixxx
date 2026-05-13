import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSessionExpired, shouldRefreshSession, DEFAULT_REFRESH_THRESHOLD_MS } from './sessionPolicy';

type InvalidSessionReason = 'expired' | 'refresh_failed';
type InvalidSessionHandler = (reason: InvalidSessionReason) => Promise<void>;

type RetryPolicy = {
  maxAttempts?: number;
  retryDelayMs?: number;
};

const sleep = async (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export const refreshSessionOrInvalidate = async (
  client: Pick<SupabaseClient, 'auth'>,
  onInvalidSession: InvalidSessionHandler,
  retryPolicy: RetryPolicy = {},
): Promise<{ ok: true; session: Session | null } | { ok: false }> => {
  const maxAttempts = Math.max(1, retryPolicy.maxAttempts ?? 2);
  const retryDelayMs = Math.max(0, retryPolicy.retryDelayMs ?? 250);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data, error } = await client.auth.refreshSession();

    if (!error && data.session) {
      if (isSessionExpired(data.session)) {
        await onInvalidSession('expired');
        return { ok: false };
      }

      return { ok: true, session: data.session };
    }

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs * attempt);
      continue;
    }

    await onInvalidSession('refresh_failed');
    return { ok: false };
  }

  await onInvalidSession('refresh_failed');
  return { ok: false };
};

export const createSessionRefreshScheduler = (
  client: Pick<SupabaseClient, 'auth'>,
  options: {
    refreshThresholdMs?: number;
    intervalMs?: number;
    retryPolicy?: RetryPolicy;
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
      await refreshSessionOrInvalidate(client, options.onInvalidSession, options.retryPolicy);
    }
  };

  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();

  return () => window.clearInterval(timer);
};
