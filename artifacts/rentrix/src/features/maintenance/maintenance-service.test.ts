import { beforeEach, describe, expect, it, vi } from 'vitest';

function createQueryMock(result: unknown) {
  const chain = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    returns: vi.fn(() => Promise.resolve(result)),
    select: vi.fn(() => chain),
    single: vi.fn(() => chain),
    update: vi.fn(() => chain),
  };

  return chain;
}

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

describe('maintenance service failure and mutation boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws list failures instead of returning an empty success state', async () => {
    const chain = createQueryMock({ data: null, error: new Error('maintenance table unavailable') });
    supabaseMock.from.mockReturnValue(chain);
    const { listMaintenance } = await import('./maintenance-service');

    await expect(listMaintenance('all', '')).rejects.toThrow('maintenance table unavailable');
    expect(supabaseMock.from).toHaveBeenCalledWith('maintenance_requests');
  });

  it('throws create failures so the mutation does not report success', async () => {
    const chain = createQueryMock({ data: null, error: new Error('insert rejected') });
    supabaseMock.from.mockReturnValue(chain);
    const { createMaintenance } = await import('./maintenance-service');

    await expect(createMaintenance({ property_id: 'property-1', title: 'Test', priority: 'medium', status: 'open', cost: 0 })).rejects.toThrow('insert rejected');
  });

  it('sets resolved_at only for terminal maintenance statuses', async () => {
    const chain = createQueryMock({ data: { id: 'maintenance-1' }, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { updateMaintenanceStatus } = await import('./maintenance-service');

    await updateMaintenanceStatus('maintenance-1', 'resolved');
    expect(chain.update).toHaveBeenCalledWith({ status: 'resolved', resolved_at: expect.any(String) });

    await updateMaintenanceStatus('maintenance-1', 'in_progress');
    expect(chain.update).toHaveBeenLastCalledWith({ status: 'in_progress', resolved_at: null });
  });
});
