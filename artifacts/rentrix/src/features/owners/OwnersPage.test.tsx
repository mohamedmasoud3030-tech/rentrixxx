import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OwnersPage } from './OwnersPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to }: { children: React.ReactNode; params?: { propertyId?: string }; to: string }) => {
    const href = params?.propertyId ? `/properties/${params.propertyId}` : to;
    return <a href={href}>{children}</a>;
  },
}));

const ownerPageMocks = vi.hoisted(() => ({
  createOwner: { isPending: false, mutateAsync: vi.fn() },
  linkOwner: { isPending: false, mutateAsync: vi.fn() },
  unlinkOwner: { isPending: false, mutateAsync: vi.fn() },
  updateOwner: { isPending: false, mutateAsync: vi.fn() },
  updateLink: { isPending: false, mutateAsync: vi.fn() },
}));

const activeContract = { id: 'contract-1', property_id: 'property-1' };

const owner = {
  id: 'owner-1',
  full_name: 'مالك مرتبط',
  display_name: null,
  phone: null,
  email: null,
  national_id: null,
  tax_number: null,
  address: null,
  notes: null,
  is_active: true,
  created_at: '2026-05-15T00:00:00.000Z',
  updated_at: '2026-05-15T00:00:00.000Z',
};

const propertyOwnerLink = {
  id: 'link-1',
  property_id: 'property-1',
  owner_id: 'owner-1',
  ownership_percentage: 60,
  is_primary: true,
  starts_on: '2026-05-01',
  ends_on: null,
  created_at: '2026-05-15T00:00:00.000Z',
  updated_at: '2026-05-15T00:00:00.000Z',
  owner,
};

const properties = [
  {
    id: 'property-1',
    title: 'عقار مرتبط',
    type: 'سكني',
    address: 'مسقط',
    owner_name: 'مالك نصي قديم',
    purchase_value: null,
    current_value: null,
    status: 'active',
    notes: null,
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T00:00:00.000Z',
    deleted_at: null,
    property_owners: [propertyOwnerLink],
  },
  {
    id: 'property-2',
    title: 'عقار متاح',
    type: 'تجاري',
    address: 'صلالة',
    owner_name: null,
    purchase_value: null,
    current_value: null,
    status: 'active',
    notes: null,
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T00:00:00.000Z',
    deleted_at: null,
    property_owners: [],
  },
];

vi.mock('./useOwners', () => ({
  useCreateOwner: () => ownerPageMocks.createOwner,
  useLinkOwnerToProperty: () => ownerPageMocks.linkOwner,
  useOwnerActiveContracts: () => ({ data: [activeContract], isLoading: false }),
  useOwners: () => ({ data: [owner], isLoading: false }),
  usePropertiesWithOwners: () => ({ data: properties, isLoading: false }),
  useUnlinkOwnerFromProperty: () => ownerPageMocks.unlinkOwner,
  useUpdateOwner: () => ownerPageMocks.updateOwner,
  useUpdatePropertyOwnerLink: () => ownerPageMocks.updateLink,
}));

describe('OwnersPage relationship flow surface', () => {
  it('renders native select link controls and edit/unlink actions for owner-property relationships', () => {
    const html = renderToStaticMarkup(<OwnersPage />);

    expect(html).toContain('<select');
    expect(html).toContain('value=""');
    expect(html).toContain('اختر العقار');
    expect(html).toContain('<option value="property-2">عقار متاح</option>');
    expect(html).toContain('بحث باسم المالك أو الهاتف أو الإيميل أو العقار');
    expect(html).toContain('عقار مرتبط');
    expect(html).toContain('/properties/property-1');
    expect(html).toContain('العقود النشطة');
    expect(html).toContain('ربط المالك بالعقار');
    expect(html).toContain('تعديل العلاقة');
    expect(html).toContain('إلغاء الربط');
    expect(html).toContain('نسبة الملكية:');
    expect(html).toContain('60%');
    expect(html).toContain('2026-05-01');
  });
});
