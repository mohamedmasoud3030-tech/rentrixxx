import { describe, expect, it } from 'vitest';
import { normalizeUnitStatus } from './unit-schema';

describe('normalizeUnitStatus', () => {
  it('normalizes legacy uppercase values from Supabase', () => {
    expect(normalizeUnitStatus('AVAILABLE')).toBe('available');
    expect(normalizeUnitStatus(' OCCUPIED ')).toBe('occupied');
  });

  it('preserves canonical lowercase unit statuses', () => {
    expect(normalizeUnitStatus('maintenance')).toBe('maintenance');
    expect(normalizeUnitStatus('reserved')).toBe('reserved');
  });

  it('rejects unsupported values instead of silently misclassifying a unit', () => {
    expect(() => normalizeUnitStatus('unknown')).toThrow('Unsupported unit status: unknown');
  });
});
