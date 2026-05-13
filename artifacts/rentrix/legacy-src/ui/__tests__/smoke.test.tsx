import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import Dashboard from '../Dashboard';
import Finance from '../Finance';

vi.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    auth: { login: vi.fn(async () => ({ ok: true })) },
    db: {
      contracts: [], tenants: [], units: [], properties: [], receipts: [], expenses: [], invoices: [],
      maintenanceRecords: [], journalEntries: [],
    },
    settings: { general: { company: { name: 'Test Co' } }, operational: { currency: 'OMR', contractAlertDays: 30 } },
    contractBalances: {}, ownerBalances: {}, isDataStale: false,
  }),
}));

vi.mock('../../components/finance/FinanceIntelligenceHub', () => ({ default: () => <div>Hub</div> }));

describe('UI smoke tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Login without crashing', () => {
    const { container } = render(<Login />);
    expect(container).toBeInTheDocument();
  });

  it('renders Dashboard without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(container).toBeInTheDocument();
  });

  it('renders Finance routes shell without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/financial/invoices']}>
        <Finance />
      </MemoryRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
