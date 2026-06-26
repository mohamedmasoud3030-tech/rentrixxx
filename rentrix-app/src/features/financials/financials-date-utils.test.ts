import { describe, expect, it } from 'vitest';
import { getTodayLocalDateString } from './financials-date-utils';

describe('getTodayLocalDateString', () => {
  it('formats date inputs from local calendar parts instead of UTC ISO strings', () => {
    const utcDate = new Date('2026-01-01T01:30:00.000Z');
    const localDate = Object.assign(utcDate, {
      getFullYear: () => 2025,
      getMonth: () => 11,
      getDate: () => 31,
    });

    expect(utcDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(getTodayLocalDateString(localDate)).toBe('2025-12-31');
  });
});
