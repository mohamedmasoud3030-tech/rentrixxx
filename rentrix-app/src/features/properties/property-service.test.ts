import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePropertyPayload } from './property-service';

function createQueryMock(result: unknown) {
  const chain = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => chain),
    update: vi.fn(() => chain),
    returns: vi.fn(() => Promise.resolve(result)),
  };

  return chain;
}

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
}));

describe('property service write workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps validated form payloads to the Supabase insert contract', () => {
    expect(normalizePropertyPayload({
      title: 'عمارة الندى',
      type: 'سكني',
      address: 'الخوير',
      owner_name: null,
      purchase_value: null,
      current_value: 1200,
      status: 'active',
      notes: null,
    })).toMatchObject({
      title: 'عمارة الندى',
      type: 'سكني',
      address: 'الخوير',
      status: 'active',
    });
  });

  it('throws actionable permission errors on create failures', async () => {
    const chain = createQueryMock({ data: null, error: new Error('permission denied for table properties') });
    supabaseMock.from.mockReturnValue(chain);
    const { createProperty } = await import('./property-service');

    await expect(createProperty({
      title: 'عمارة الندى',
      type: 'سكني',
      address: 'الخوير',
      owner_name: null,
      purchase_value: null,
      current_value: null,
      status: 'active',
      notes: null,
    })).rejects.toThrow('لا تملك صلاحية الكتابة على العقارات');
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'عمارة الندى' }));
  });

  it('archives properties with deleted_at instead of hard deleting', async () => {
    const chain = createQueryMock({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { softDeleteProperty } = await import('./property-service');

    await softDeleteProperty('property-1');
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 'property-1');
  });
});


describe('property with owner agreement RPC workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps property-with-agreement payloads to the live RPC arguments', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { property_id: 'property-1', agreement_id: 'agreement-1' },
      error: null,
    });
    const { createPropertyWithAgreement } = await import('../owners/ownerAgreementService');

    await expect(createPropertyWithAgreement({
      title: 'عمارة الندى',
      type: 'سكني',
      address: 'الخوير',
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
      owner_name: null,
      purchase_value: 100000,
      current_value: 120000,
      status: 'active',
      notes: 'ملاحظة',
      agreement_type: 'property_management',
      commission_type: 'RATE',
      commission_value: 10,
      agreement_starts_on: '2026-01-01',
      agreement_ends_on: null,
    })).resolves.toEqual({ property_id: 'property-1', agreement_id: 'agreement-1' });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_property_with_agreement', {
      p_title: 'عمارة الندى',
      p_type: 'سكني',
      p_address: 'الخوير',
      p_owner_id: '123e4567-e89b-12d3-a456-426614174000',
      p_agreement_type: 'property_management',
      p_commission_type: 'RATE',
      p_commission_value: 10,
      p_agreement_starts_on: '2026-01-01',
      p_agreement_ends_on: null,
      p_owner_name: null,
      p_purchase_value: 100000,
      p_current_value: 120000,
      p_status: 'active',
      p_notes: 'ملاحظة',
    });
  });

  it('rejects malformed property-with-agreement RPC responses', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: { property_id: '', agreement_id: 'agreement-1' }, error: null });
    const { createPropertyWithAgreement } = await import('../owners/ownerAgreementService');

    await expect(createPropertyWithAgreement({
      title: 'عمارة الندى',
      type: 'سكني',
      address: 'الخوير',
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
      agreement_type: 'property_management',
      commission_type: 'FIXED_MONTHLY',
      commission_value: 500,
      agreement_starts_on: '2026-01-01',
    })).rejects.toThrow('استجابة غير صالحة من خدمة حفظ العقار والاتفاقية. حاول مرة أخرى.');
  });
});
