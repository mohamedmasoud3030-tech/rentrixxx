import { describe, expect, it } from 'vitest';
import { toLocalDateInputValue } from './expenses-page';

describe('expenses page date defaults', () => {
  it('formats date inputs from local calendar parts instead of UTC ISO strings', () => {
    const utcDate = new Date('2026-01-01T01:30:00.000Z');

    const getFullYear = () => 2025;
    const getMonth = () => 11;
    const getDate = () => 31;
    const localDate = Object.assign(utcDate, { getFullYear, getMonth, getDate });

    expect(utcDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(toLocalDateInputValue(localDate)).toBe('2025-12-31');
  });
});
