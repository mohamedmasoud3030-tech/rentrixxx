import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractsListPage } from './ContractsListPage';

vi.mock('../settings/useCompanySettings', async () => {
  const { testCompanySettingsContract } = await import('../../test/companySettingsContractMock');

  return { useCompanySettingsContract: () => testCompanySettingsContract };
});

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
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ContractsListPage />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    contractsMocks.contractsQuery.data = [];
    contractsMocks.contractsQuery.error = null;
    contractsMocks.contractsQuery.isError = false;
    contractsMocks.contractsQuery.isLoading = false;
  });

  it('keeps page shell actions available when contract loading fails', () => {
    contractsMocks.contractsQuery.error = new Error('تعذر تحميل عقود الاختبار');
    contractsMocks.contractsQuery.isError = true;

    const html = renderPage();

    expect(html).toContain('العقود');
    expect(html).toContain('تحسينات واجهة العقود مع إحصاءات وبحث وفلاتر وتصدير');
    expect(html).toContain('إنشاء عقد');
  });

  it('keeps the empty state available when there are no contracts', () => {
    const html = renderPage();

    expect(html).toContain('لا توجد عقود');
    expect(html).toContain('إنشاء عقد');
  });
});
