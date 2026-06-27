import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePersonPayload } from './people-service';

function createQueryMock(result: unknown) {
  const chain = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => chain),
    update: vi.fn(() => chain),
    returns: vi.fn(() => Promise.resolve(result)),
  };

  return chain;
}

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
}));

describe('people service write workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes create and edit payloads before they reach Supabase', () => {
    expect(normalizePersonPayload({
      full_name: '  أحمد سالم  ',
      phone: ' 90000000 ',
      email: ' tenant@example.com ',
      national_id: ' ',
      type: 'tenant',
      address: ' مسقط ',
      notes: '',
    })).toEqual({
      full_name: 'أحمد سالم',
      phone: '90000000',
      email: 'tenant@example.com',
      national_id: null,
      type: 'tenant',
      address: 'مسقط',
      notes: null,
    });
  });

  it('creates people through the expected Supabase insert contract', async () => {
    const row = { id: 'person-1', full_name: 'أحمد سالم', type: 'tenant', phone: null, email: null, national_id: null, address: null, notes: null, created_at: null, updated_at: null, deleted_at: null };
    const chain = createQueryMock({ data: row, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { createPerson } = await import('./people-service');

    await expect(createPerson({ full_name: ' أحمد سالم ', type: 'tenant', phone: '', email: '', national_id: '', address: '', notes: '' })).resolves.toEqual(row);
    expect(supabaseMock.from).toHaveBeenCalledWith('people');
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'أحمد سالم', type: 'tenant' }));
    expect(chain.select).toHaveBeenCalledWith('*');
  });

  it('keeps permission failures actionable in Arabic', async () => {
    const chain = createQueryMock({ data: null, error: { code: '42501', message: 'permission denied for table people' } });
    supabaseMock.from.mockReturnValue(chain);
    const { updatePerson } = await import('./people-service');

    await expect(updatePerson('person-1', { full_name: 'أحمد سالم', type: 'tenant', phone: '', email: '', national_id: '', address: '', notes: '' }))
      .rejects.toThrow('لا تملك صلاحية الكتابة أو القراءة المطلوبة');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'أحمد سالم' }));
    expect(chain.eq).toHaveBeenCalledWith('id', 'person-1');
  });

  it('archives people with deleted_at instead of hard deleting', async () => {
    const chain = createQueryMock({ data: null, error: null });
    supabaseMock.from.mockReturnValue(chain);
    const { softDeletePerson } = await import('./people-service');

    await softDeletePerson('person-1');
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith('id', 'person-1');
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null);
  });
});
