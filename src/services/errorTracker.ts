import { getAppEnv } from '@/config/env';
import { sanitizeHeaders } from '@/utils/sanitizeHeaders';

export type ErrorContext = {
  area: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
};

const normalizeError = (error: unknown): { name: string; message: string; stack?: string } => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'NonErrorThrown', message: String(error) };
};

const captureWithBeacon = (dsn: string, body: string): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;
  const blob = new Blob([body], { type: 'application/json' });
  return navigator.sendBeacon(dsn, blob);
};

export const errorTracker = {
  capture(error: unknown, context: ErrorContext): void {
    const normalized = normalizeError(error);

    let dsn = '';
    let releaseVersion = '';
    try {
      const env = getAppEnv();
      dsn = env.errorTrackerDsn || '';
      releaseVersion = env.releaseVersion || 'development';
    } catch {
      // skip env hard failure for tracker path; app bootstrap handles required env.
    }

    const payload = JSON.stringify({
      ts: new Date().toISOString(),
      releaseVersion,
      context,
      error: normalized,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : '',
    });

    if (!dsn) {
      // eslint-disable-next-line no-console
      console.error('[error-tracker:fallback]', payload);
      return;
    }

    if (captureWithBeacon(dsn, payload)) return;

    void fetch(dsn, {
      method: 'POST',
      headers: sanitizeHeaders({ 'Content-Type': 'application/json' }),
      body: payload,
      keepalive: true,
    }).catch(() => {
      // no-op: tracking must not break UX
    });
  },
};
