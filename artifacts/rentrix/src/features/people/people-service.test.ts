import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

type QueryLogEntry = { method: string; args: unknown[] };
type ChainMethod = 'select' | 'is' | 'order' | 'range' | 'or' | 'eq';

type QueryBuilder = Record<ChainMethod | 'returns', ReturnType<typeof vi.fn>>;

function createQueryBuilder(log: QueryLogEntry[]) {
  const builder: Partial<QueryBuilder> = {};
  const methods: ChainMethod[] = ['select', 'is', 'order', 'range', 'or', 'eq'];

  for (const method of methods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      log.push({ method, args });
      return builder;
    });
  }

  builder.returns = vi.fn(async () => ({ data: [], count: 0, error: null }));

  return builder;
}

function mockPeopleQuery() {
  const log: QueryLogEntry[] = [];
  supabaseMock.from.mockImplementation(() => createQueryBuilder(log));
  return log;
}

describe('people-service query guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clamps invalid pagination values to safe range bounds', async () => {
    const log = mockPeopleQuery();
    const { listPeople, MAX_PAGE_SIZE } = await import('./people-service');

    await listPeople({ search: '', type: 'all', page: 0, pageSize: 0 });
    await listPeople({ search: '', type: 'all', page: -10, pageSize: -5 });
    await listPeople({ search: '', type: 'all', page: 1, pageSize: MAX_PAGE_SIZE + 999 });

    const rangeCalls = log.filter((entry) => entry.method === 'range').map((entry) => entry.args);

    expect(rangeCalls[0]).toEqual([0, 19]);
    expect(rangeCalls[1]).toEqual([0, 0]);
    expect(rangeCalls[2]).toEqual([0, MAX_PAGE_SIZE - 1]);
  });

  it('keeps escaped search behavior for ilike filters', async () => {
    const log = mockPeopleQuery();
    const { listPeopleForExport } = await import('./people-service');

    await listPeopleForExport(String.raw` acme_% ' " ,`, 'all');

    const orCall = log.find((entry) => entry.method === 'or');
    expect(orCall).toBeTruthy();
    expect(orCall?.args[0]).toContain(String.raw`acme\_\% ' " ,`);
  });
});
