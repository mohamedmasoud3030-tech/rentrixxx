import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: any) => children,
  useNavigate: () => vi.fn(),
}));

// Mock useCompanySettingsContract
vi.mock('@/features/settings/useCompanySettings', () => ({
  useCompanySettingsContract: () => ({
    locale: 'ar-OM',
    currency: 'OMR',
    currencyDecimals: 3,
    dateFormat: 'YYYY-MM-DD',
  }),
}));

// Mock react-query useQuery
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

const mockSnapshot = {
  period: {
    dateFrom: '2026-06-01',
    dateTo: '2026-06-28',
  },
  operational: {
    properties: 4,
    units: 15,
    activeContracts: 8,
    expiringContracts30Days: 2,
    vacantUnits: 3,
    occupiedUnits: 12,
    occupancyRate: 80,
  },
  financial: {
    rentDue: 15000,
    collectedRent: 12000,
    outstandingRent: 3000,
    expenses: 1500,
    netPosition: 10500,
  },
  activeContracts: [
    {
      id: 'contract-1',
      end_date: '2026-07-15',
      properties: { title: 'برจ الياسمين' },
      units: { unit_number: '101' },
      people: { full_name: 'سالم الكعبي' },
    }
  ],
  arrears: {
    totalOverdue: 3000,
    overdueInvoiceCount: 2,
    overdueInvoices: [
      {
        invoiceId: 'invoice-1',
        tenantName: 'أحمد الفارسي',
        propertyTitle: 'برج الخليج',
        unitNumber: '5',
        dueDate: '2026-06-10',
        daysOverdue: 18,
        remainingAmount: 1500,
      }
    ],
    agedReceivables: {
      buckets: {
        days_1_30: { total: 1500, invoiceCount: 1 },
        days_31_60: { total: 1500, invoiceCount: 1 },
        days_61_90: { total: 0, invoiceCount: 0 },
        days_90_plus: { total: 0, invoiceCount: 0 },
      }
    }
  }
};

describe('Modular DashboardPage Rendering and Hierarchy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the core dashboard operating overview hierarchy on successful data loading', () => {
    // Mock successful loading state
    (useQuery as any).mockReturnValue({
      data: mockSnapshot,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    });

    const html = renderToStaticMarkup(<DashboardPage />);

    // 1. Verify Hero Banner & Title
    expect(html).toContain('لوحة التحكم');
    expect(html).toContain('عقد نشط');
    expect(html).toContain('وحدة شاغرة');

    // 2. Verify KPI Cards & Values
    expect(html).toContain('نسبة الإشغال');
    expect(html).toContain('المتأخرات');

    // 3. Verify Quick Actions Section
    expect(html).toContain('إجراءات سريعة');
    expect(html).toContain('إنشاء عقد');
    expect(html).toContain('الفواتير');

    // 4. Verify Urgent Sections (Expiring Contracts & Overdue items)
    expect(html).toContain('العقود المنتهية قريباً');
    expect(html).toContain('سالم الكعبي');
    expect(html).toContain('أعلى المتأخرات');
    expect(html).toContain('أحمد الفارسي');

    // 5. Verify Financial Monthly Summary
    expect(html).toContain('النظرة المالية للشهر');
    expect(html).toContain('المحصّل');
    expect(html).toContain('المتبقي');

    // 6. Verify Aged accounts receivables breakdown exists
    expect(html).toContain('أعمار الذمم');
  });

  it('preserves robust layout skeleton during query loading state', () => {
    // Mock loading state
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<DashboardPage />);

    // Skeletons are rendered for Hero, KPIs, and Urgent lists
    expect(html).toContain('skeleton-shimmer');
  });
});
