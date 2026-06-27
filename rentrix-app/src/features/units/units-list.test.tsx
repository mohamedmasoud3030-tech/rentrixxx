import type { UseQueryResult } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Unit } from '@/types/domain';
import { UnitsList } from './units-list';

vi.mock('./unit-form-modal', () => ({
  UnitFormModal: () => null,
}));

vi.mock('./use-units', () => ({
  useSoftDeleteUnit: () => ({ isPending: false, mutate: vi.fn() }),
}));

function makeUnitsQuery(overrides: Partial<UseQueryResult<Unit[]>>): UseQueryResult<Unit[]> {
  return {
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as UseQueryResult<Unit[]>;
}

describe('UnitsList load states', () => {
  it('surfaces property unit loading failures instead of rendering an empty workflow', () => {
    const unitsQuery = makeUnitsQuery({
      data: undefined,
      error: new Error('permission denied for table units'),
      isError: true,
    });

    const html = renderToStaticMarkup(<UnitsList propertyId="property-1" unitsQuery={unitsQuery} />);

    expect(html).toContain('تعذر تحميل وحدات العقار');
    expect(html).toContain('حدث خطأ أثناء تحميل البيانات.');
    expect(html).toContain('إعادة المحاولة');
    expect(html).not.toContain('لا توجد وحدات');
  });
});
