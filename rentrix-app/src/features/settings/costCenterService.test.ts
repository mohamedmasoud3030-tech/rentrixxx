import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}));

describe('costCenterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes optional property and parent fields in write payloads', async () => {
    const { costCenterPayload } = await import('./costCenterService');

    expect(costCenterPayload({
      name: '  صيانة برج النخيل  ',
      property_id: '  ',
      parent_id: '',
      is_active: true,
    })).toEqual({
      name: 'صيانة برج النخيل',
      property_id: null,
      parent_id: null,
      is_active: true,
    });
  });

  it('loads non-archived cost centers ordered by creation date', async () => {
    const rows = [{ id: 'cost-1', name: 'تشغيل', property_id: null, parent_id: null, is_active: true, created_at: '2026-06-01', updated_at: null, deleted_at: null }];
    const returns = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn(() => ({ returns }));
    const is = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ is }));
    supabaseMock.from.mockReturnValue({ select });

    const { listCostCenters } = await import('./costCenterService');

    await expect(listCostCenters()).resolves.toEqual(rows);
    expect(supabaseMock.from).toHaveBeenCalledWith('cost_centers');
    expect(select).toHaveBeenCalledWith('*');
    expect(is).toHaveBeenCalledWith('deleted_at', null);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('rejects blank names and self-parenting before writing', async () => {
    const { saveCostCenter } = await import('./costCenterService');

    await expect(saveCostCenter({ name: ' ', property_id: '', parent_id: '', is_active: true })).rejects.toThrow('اسم مركز التكلفة مطلوب.');
    await expect(saveCostCenter({ name: 'تشغيل', property_id: '', parent_id: 'cost-1', is_active: true }, 'cost-1')).rejects.toThrow('لا يمكن جعل مركز التكلفة تابعاً لنفسه.');
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
