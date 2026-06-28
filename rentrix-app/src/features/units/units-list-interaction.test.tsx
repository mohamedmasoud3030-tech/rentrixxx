import type { UseQueryResult } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Unit } from '@/types/domain';
import { UnitsList } from './units-list';

// Global mocks to store props passed to children
const mockNavigate = vi.fn();
let lastEntityTableProps: any = null;
let lastUnitCardProps: any = null;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: any) => children,
}));

vi.mock('./unit-form-modal', () => ({
  UnitFormModal: () => null,
}));

vi.mock('./use-units', () => ({
  useSoftDeleteUnit: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('@/components/ui/entity-table', () => {
  return {
    EntityTable: (props: any) => {
      lastEntityTableProps = props;
      return <div data-testid="entity-table" />;
    },
  };
});

vi.mock('@/components/ui/unit-card', () => {
  return {
    UnitCard: (props: any) => {
      lastUnitCardProps = props;
      return <div data-testid="unit-card" />;
    },
  };
});

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

describe('UnitsList Property-Scoped Unit Navigation Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastEntityTableProps = null;
    lastUnitCardProps = null;
  });

  it('verifies that desktop row click navigates to nested unit detail URL', () => {
    const unitsQuery = makeUnitsQuery({
      data: [{ id: 'unit-101', unit_number: '101', status: 'available', rent_amount: 1500, floor: '1' } as Unit],
    });

    renderToStaticMarkup(<UnitsList propertyId="property-123" unitsQuery={unitsQuery} />);

    expect(lastEntityTableProps).not.toBeNull();
    
    // Simulate desktop row click on a unit
    lastEntityTableProps.onRowClick({ id: 'unit-101' });

    // Verify it navigates exactly to the nested unit detail URL
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/properties/$propertyId/units/$unitId',
      params: { propertyId: 'property-123', unitId: 'unit-101' },
    });
  });

  it('verifies that mobile card click navigates to nested unit detail URL', () => {
    const unitsQuery = makeUnitsQuery({
      data: [{ id: 'unit-202', unit_number: '202', status: 'available', rent_amount: 2000, floor: '2' } as Unit],
    });

    renderToStaticMarkup(<UnitsList propertyId="property-123" unitsQuery={unitsQuery} />);

    // Render the mobile card to capture props passed to UnitCard
    renderToStaticMarkup(lastEntityTableProps.renderMobileCard(unitsQuery.data![0]));

    expect(lastUnitCardProps).not.toBeNull();

    // Simulate clicking on the mobile card
    lastUnitCardProps.onClick();

    // Verify it navigates exactly to the nested unit detail URL
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/properties/$propertyId/units/$unitId',
      params: { propertyId: 'property-123', unitId: 'unit-202' },
    });
  });
});
