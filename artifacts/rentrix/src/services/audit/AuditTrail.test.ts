import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertMock, fromMock, errorMock } = vi.hoisted(() => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));
  const error = vi.fn();
  return { insertMock: insert, fromMock: from, errorMock: error };
});

vi.mock('@/services/api/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/infrastructure/observability', () => ({
  logger: {
    error: errorMock,
  },
}));

import { AuditTrail, toJson } from './AuditTrail';

describe('AuditTrail', () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
    errorMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('constructs payload with mapped fields and excludes legacy fields', async () => {
    await AuditTrail.log({
      action: 'CREATE_DOCUMENT',
      entityType: 'contracts',
      entityId: 'c-1',
      performedBy: 'u-1',
      referenceId: 'ref-1',
      before: { old: true },
      after: { old: false },
      timestamp: 1000,
    });

    expect(fromMock).toHaveBeenCalledWith('audit_log');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_id: 'u-1',
      action: 'CREATE_DOCUMENT',
      entity_id: 'c-1',
      table: 'contracts',
    });
    expect(payload).toHaveProperty('details.timestamp_ms', 1000);
    expect(payload).toHaveProperty('details.occurred_at', '1970-01-01T00:00:01.000Z');
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('ts');
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('entity');
    expect(payload).not.toHaveProperty('note');
  });

  it('toJson returns object values as-is', () => {
    const input = { a: 1, b: 'x' };
    expect(toJson(input)).toBe(input);
  });

  it('toJson wraps primitives, arrays, and nullish values', () => {
    expect(toJson('hello')).toEqual({ value: 'hello' });
    expect(toJson(7)).toEqual({ value: 7 });
    expect(toJson([1, 2])).toEqual({ value: [1, 2] });
    expect(toJson(null)).toEqual({ value: null });
    expect(toJson(undefined)).toEqual({ value: null });
  });

  it('does not crash for circular or large objects in before/after states', async () => {
    const circular: Record<string, unknown> = { key: 'value' };
    circular.self = circular;
    const large = { items: new Array(3000).fill({ x: 'y' }) };

    await expect(AuditTrail.log({
      action: 'UPDATE_DOCUMENT',
      entityType: 'invoices',
      entityId: 'i-1',
      before: circular,
      after: large,
      performedBy: 'u-2',
    })).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
