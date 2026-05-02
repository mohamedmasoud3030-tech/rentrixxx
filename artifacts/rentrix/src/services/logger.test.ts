import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.fn();

vi.mock('./errorTracker', () => ({
  errorTracker: {
    capture,
  },
}));

import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    capture.mockReset();
  });

  it('forwards error logs to error tracker', () => {
    logger.error('service failure', { area: 'service', action: 'fetch', message: 'failed' });

    expect(capture).toHaveBeenCalledTimes(1);
  });
});
