import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractDetailPage } from './ContractDetailPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to }: Readonly<{ children: React.ReactNode; params?: { contractId?: string }; to: string }>) => {
    const href = params?.contractId ? `/contracts/${params.contractId}` : to;
    return <a href={href}>{children}</a>;
  },
  useNavigate: () => vi.fn(),
  useParams: () => ({ contractId: 'contract-1' }),
}));

const contractsMocks = vi.hoisted(() => ({
  contractQuery: { data: null as unknown, error: null as Error | null, isError: false, isLoading: false, refetch: vi.fn() },
  renewMutation: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock('./useContracts', () => ({
  useContract: () => contractsMocks.contractQuery,
  useRenewContract: () => contractsMocks.renewMutation,
}));

const contractDetail = {
  id: 'contract-1',
  property_id: 'property-1',
  unit_id: 'unit-1',
  tenant_id: 'tenant-1',
  renewed_from_id: null,
  start_date: '2026-05-01',
  end_date: '2027-04-30',
  rent_amount: 1234.5,
  payment_cycle: 'monthly',
  status: 'active',
  notes: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-02T00:00:00.000Z',
  deleted_at: null,
  people: { id: 'tenant-1', full_name: 'مستأجر الاختبار', phone: null, email: null, national_id: null },
  properties: { id: 'property-1', title: 'عقار الاختبار', address: 'مسقط' },
  renewed_from: null,
  units: { id: 'unit-1', unit_number: 'A-1', floor: '1', status: 'occupied', rent_amount: 1234.5 },
};

describe('ContractDetailPage load and money states', () => {
  beforeEach(() => {
    contractsMocks.contractQuery.data = contractDetail;
    contractsMocks.contractQuery.error = null;
    contractsMocks.contractQuery.isError = false;
    contractsMocks.contractQuery.isLoading = false;
  });

  it('renders rent with centralized currency context', () => {
    const html = renderToStaticMarkup(<ContractDetailPage />);

    expect(html).toContain('OMR');
    expect(html).toContain('مستأجر الاختبار');
    expect(html).toContain('A-1');
  });

  it('renders contract-scoped financial and lifecycle timeline context', () => {
    const html = renderToStaticMarkup(<ContractDetailPage />);

    expect(html).toContain('الخط الزمني المالي');
    expect(html).toContain('دورة السداد: شهري');
    expect(html).toContain('حالة العقد');
    expect(html).toContain('آخر تعديل محفوظ على بيانات العقد');
  });

  it('renders a contract-scoped read-only documents shell without workflow actions', () => {
    const html = renderToStaticMarkup(<ContractDetailPage />);

    expect(html).toContain('تبويب مستندات العقد');
    expect(html).toContain('قراءة فقط');
    expect(html).toContain('نسخة العقد الموقعة');
    expect(html).toContain('مرجع العقد: #contract');
    expect(html).toContain('دون رفع ملفات أو توليد PDF أو إضافة جداول جديدة');
  });

  it('renders a retryable error state when contract detail loading fails', () => {
    contractsMocks.contractQuery.data = null;
    contractsMocks.contractQuery.error = new Error('تعذر تحميل عقد الاختبار');
    contractsMocks.contractQuery.isError = true;

    const html = renderToStaticMarkup(<ContractDetailPage />);

    expect(html).toContain('تعذر تحميل العقد');
    expect(html).toContain('تعذر تحميل عقد الاختبار');
    expect(html).toContain('إعادة المحاولة');
  });
});
