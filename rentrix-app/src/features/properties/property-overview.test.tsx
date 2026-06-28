import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PropertyOverview } from './property-detail-page';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ propertyId: 'property-123' }),
  Link: ({ children }: any) => children,
  useLocation: () => ({ pathname: '/properties/property-123' }),
}));

// Mock useProperty and useUnits query hooks
vi.mock('./use-properties', () => ({
  useProperty: () => ({
    data: {
      id: 'property-123',
      title: 'عقار مكة التجريبي',
      type: 'building',
      status: 'active',
      address: 'مكة المكرمة',
      owner_name: 'محمد مسعود',
      purchase_value: 5000000,
      current_value: 6000000,
      notes: 'ملاحظات العقار',
      created_at: '2026-06-28',
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/units/use-units', () => ({
  useUnits: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

describe('PropertyOverview Component Rendering and Copy Integrity', () => {
  it('renders accurate, future-facing Arabic placeholder copy for agreement and financial details', () => {
    const html = renderToStaticMarkup(<PropertyOverview />);

    // Renders the correct future-facing, evidence-based Arabic copy
    expect(html).toContain('ستظهر اتفاقية التشغيل هنا عند توفر بياناتها.');
    expect(html).toContain('سيظهر الملخص المالي هنا عند توفر بيانات مالية مرتبطة بالعقار.');

    // DOES NOT render unsupported negative claims
    expect(html).not.toContain('لا توجد اتفاقية تشغيل نشطة مسجلة حالياً لهذا العقار.');
    expect(html).not.toContain('لا تتوفر حركات مالية أو تصفية محاسبية نشطة مسجلة لهذا العقار حالياً.');
  });
});
