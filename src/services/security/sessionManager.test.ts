import { describe, expect, it, vi } from 'vitest';
import { isSessionExpired, refreshSessionOrInvalidate, shouldRefreshSession } from './sessionManager';

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

  it('handles refresh failure by invalidating session', async () => {
    const onInvalidSession = vi.fn().mockResolvedValue(undefined);
    const client = {
      auth: {
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('boom') }),
      },
    } as any;

    const result = await refreshSessionOrInvalidate(client, onInvalidSession);

    expect(result.ok).toBe(false);
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
});
