import { describe, expect, it, vi } from 'vitest';
import {
  isSessionExpired,
  refreshSessionOrInvalidate,
  sanitizeUiTextPayload,
  shouldRefreshSession,
} from './sessionManager';

const buildSession = (expiresAtSecondsFromNow: number) => ({
  expires_at: Math.floor((Date.now() + expiresAtSecondsFromNow * 1000) / 1000),
}) as any;

describe('sessionManager', () => {
  it('handles token expiry checks', () => {
    const expired = buildSession(-10);
    const nearExpiry = buildSession(30);

    expect(isSessionExpired(expired)).toBe(true);
    expect(shouldRefreshSession(nearExpiry, Date.now(), 60_000)).toBe(true);
  });

  it('retries failed refresh and invalidates session on final failure', async () => {
    const onInvalidSession = vi.fn().mockResolvedValue(undefined);
    const client = {
      auth: {
        refreshSession: vi
          .fn()
          .mockResolvedValueOnce({ data: { session: null }, error: new Error('transient') })
          .mockResolvedValueOnce({ data: { session: null }, error: new Error('fatal') }),
      },
    } as any;

    const result = await refreshSessionOrInvalidate(client, onInvalidSession, { maxAttempts: 2, retryDelayMs: 0 });

    expect(result.ok).toBe(false);
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(2);
    expect(onInvalidSession).toHaveBeenCalledWith('refresh_failed');
  });

  it('supports logout fallback when refresh returns expired token', async () => {
    const onInvalidSession = vi.fn().mockResolvedValue(undefined);
    const client = {
      auth: {
        refreshSession: vi.fn().mockResolvedValue({ data: { session: buildSession(-5) }, error: null }),
      },
    } as any;

    const result = await refreshSessionOrInvalidate(client, onInvalidSession);

    expect(result.ok).toBe(false);
    expect(onInvalidSession).toHaveBeenCalledWith('expired');
  });

  it('sanitizes malformed UI payloads safely', () => {
    expect(sanitizeUiTextPayload({ note: '<script>' })).toBe('');
    expect(sanitizeUiTextPayload('  <b>hello</b>  ')).toBe('&lt;b&gt;hello&lt;/b&gt;');
  });
});
