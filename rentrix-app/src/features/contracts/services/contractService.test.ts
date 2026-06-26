import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

describe('renewContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls renew_contract_atomic with old_contract_id and new_contract_data', async () => {
    const result = { status: 'renewed', old_contract_id: 'contract-1', new_contract_id: 'contract-2' } as const;
    supabaseMock.rpc.mockResolvedValue({ data: result, error: null });
    const { renewContract } = await import('./contractService');

    await expect(renewContract('contract-1', {
      new_start: '2026-07-01',
      new_end: '2027-06-30',
      new_amount: 12000,
    })).resolves.toEqual(result);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('renew_contract_atomic', {
      old_contract_id: 'contract-1',
      new_contract_data: {
        new_start: '2026-07-01',
        new_end: '2027-06-30',
        new_amount: 12000,
      },
    });
  });

  it('extracts the returned new_contract_id from the parsed object', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { status: 'renewed', old_contract_id: 'contract-1', new_contract_id: 'contract-2' }, error: null });
    const { renewContract } = await import('./contractService');

    const result = await renewContract('contract-1', { new_start: '2026-07-01', new_end: '2027-06-30', new_amount: 12000 });

    expect(result.new_contract_id).toBe('contract-2');
  });

  it('keeps renewal RPC errors visible', async () => {
    const error = new Error('invalid renewal dates');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });
    const { renewContract } = await import('./contractService');

    await expect(renewContract('contract-1', { new_start: '2027-07-01', new_end: '2027-06-30', new_amount: 12000 })).rejects.toThrow('invalid renewal dates');
  });

  it('rejects malformed renewal success responses', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { status: 'renewed', old_contract_id: 'contract-1' }, error: null });
    const { renewContract } = await import('./contractService');

    await expect(renewContract('contract-1', { new_start: '2026-07-01', new_end: '2027-06-30', new_amount: 12000 })).rejects.toThrow('missing the new contract id');
  });
});
