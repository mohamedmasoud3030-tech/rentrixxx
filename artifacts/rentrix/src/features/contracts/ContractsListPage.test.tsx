import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractsListPage } from './ContractsListPage';

const companySettingsMock = vi.hoisted(() => ({
  companyName: 'Rentrix',
  logoUrl: null,
  defaultLanguage: 'ar' as const,
  defaultCurrency: 'OMR' as const,
  country: 'OM' as const,
  timezone: 'Asia/Muscat' as const,
  receiptPrefix: 'REC',
  invoicePrefix: 'INV',
  locale: 'ar-OM' as const,
  direction: 'rtl' as const,
}));

vi.mock('../settings/useCompanySettings', () => ({
  useCompanySettingsContract: () => companySettingsMock,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to }: Readonly<{ children: React.ReactNode; params?: { contractId?: string }; to: string }>) => {
    const href = params?.contractId ? `/contracts/${params.contractId}` : to;
    return <a href={href}>{children}</a>;
  },
}));

const contractsMocks = vi.hoisted(() => ({
  contractsQuery: { data: [] as unknown[], error: null as Error | null, isError: false, isLoading: false, refetch: vi.fn() },
  deleteMutation: { isPending: false, mutate: vi.fn() },
}));

vi.mock('./useContracts', () => ({
  useContracts: () => contractsMocks.contractsQuery,
  useSoftDeleteContract: () => contractsMocks.deleteMutation,
}));

describe('ContractsListPage load states', () => {
  beforeEach(() => {
    contractsMocks.contractsQuery.data = [];
    contractsMocks.contractsQuery.error = null;
    contractsMocks.contractsQuery.isError = false;
    contractsMocks.contractsQuery.isLoading = false;
  });

  it('renders a retryable error state when contract loading fails', () => {
    contractsMocks.contractsQuery.error = new Error('تعذر تحميل عقود الاختبار');
    contractsMocks.contractsQuery.isError = true;

    const html = renderToStaticMarkup(<ContractsListPage />);

    expect(html).toContain('تعذر تحميل العقود');
    expect(html).toContain('تعذر تحميل عقود الاختبار');
    expect(html).toContain('إعادة المحاولة');
  });

  it('keeps the empty state available when there are no contracts', () => {
    const html = renderToStaticMarkup(<ContractsListPage />);

    expect(html).toContain('لا توجد عقود');
    expect(html).toContain('إنشاء عقد');
  });
});
