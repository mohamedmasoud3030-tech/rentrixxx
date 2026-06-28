import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnitsPage } from './units-page';

// Global mocks to store props passed to children
const mockNavigate = vi.fn();
let lastEntityTableProps: any = null;
let lastUnitCardProps: any = null;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: (props: any) => {
    // If our mock Link has an onClick, let's trigger it in our tests to verify propagation
    return <a data-testid="mock-link" onClick={props.onClick}>{props.children}</a>;
  },
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: () => null,
}));

vi.mock('./use-units', () => ({
  useAllUnits: () => ({
    data: [
      { id: 'unit-1', property_id: 'prop-1', unit_number: '101', status: 'available', rent_amount: 1500, floor: '1' }
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/features/properties/use-properties', () => ({
  useProperties: () => ({
    data: {
      rows: [
        { id: 'prop-1', title: 'برج الخليج', status: 'active' }
      ],
      count: 1,
    },
    isLoading: false,
  }),
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

describe('Global UnitsPage Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastEntityTableProps = null;
    lastUnitCardProps = null;
  });

  it('proves desktop row click on UnitsPage navigates to unit detail', () => {
    renderToStaticMarkup(<UnitsPage />);

    expect(lastEntityTableProps).not.toBeNull();

    // Simulate desktop row click on the table
    lastEntityTableProps.onRowClick({ id: 'unit-1', property_id: 'prop-1' });

    // Verify row click correctly navigates to the nested unit detail route
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/properties/$propertyId/units/$unitId',
      params: { propertyId: 'prop-1', unitId: 'unit-1' },
    });
  });

  it('proves mobile card click on UnitsPage navigates to unit detail', () => {
    renderToStaticMarkup(<UnitsPage />);

    // Render the mobile card to capture props passed to UnitCard
    renderToStaticMarkup(lastEntityTableProps.renderMobileCard({ id: 'unit-1', property_id: 'prop-1', unit_number: '101' }));

    expect(lastUnitCardProps).not.toBeNull();

    // Simulate clicking on the mobile card
    lastUnitCardProps.onClick();

    // Verify it navigates exactly to the nested unit detail route
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/properties/$propertyId/units/$unitId',
      params: { propertyId: 'prop-1', unitId: 'unit-1' },
    });
  });

  it('proves that property link click prevents parent row click bubbling via stopPropagation', () => {
    renderToStaticMarkup(<UnitsPage />);

    // Retrieve the property column renderer
    const propertyCol = lastEntityTableProps.columns.find((col: any) => col.key === 'property');
    expect(propertyCol).toBeDefined();

    // Render the property column cell
    const cellMarkup = propertyCol.render({ id: 'unit-1', property_id: 'prop-1' });
    
    // We spy on stopPropagation
    const stopPropagationSpy = vi.fn();
    const mockEvent = { stopPropagation: stopPropagationSpy };

    // Simulate click on the link directly
    cellMarkup.props.onClick(mockEvent);

    // Verify stopPropagation was explicitly called, preventing parent table row-click bubble!
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});
