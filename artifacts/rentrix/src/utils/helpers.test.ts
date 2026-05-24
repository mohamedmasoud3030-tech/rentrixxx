import { describe, expect, it } from 'vitest';
import { mapCsvHeader, toCsv } from './helpers';

describe('legacy csv helpers', () => {
  it('keeps Arabic header mapping while using shared csv escaping', () => {
    const csv = toCsv([{ tenant: 'Tenant, One', amount: 25 }], ['tenant', 'amount']);

    expect(csv).toBe('المستأجر,المبلغ\n"Tenant, One",25');
  });

  it('normalizes Date values to ISO strings', () => {
    const date = new Date('2026-05-24T00:00:00.000Z');
    const csv = toCsv([{ date }], ['date']);

    expect(csv).toBe('التاريخ\n2026-05-24T00:00:00.000Z');
  });

  it('leaves unmapped headers unchanged', () => {
    expect(mapCsvHeader('customField')).toBe('customField');
  });
});
