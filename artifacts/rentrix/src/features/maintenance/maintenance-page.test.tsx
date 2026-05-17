import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaintenancePage } from './maintenance-page';

const maintenanceMocks = vi.hoisted(() => ({
  createMutation: { isPending: false, mutate: vi.fn() },
  maintenanceQuery: { data: [] as unknown[], error: null as Error | null, isError: false, isLoading: false, refetch: vi.fn() },
  propertiesQuery: { data: { rows: [] as unknown[] }, error: null as Error | null, isError: false, isLoading: false, refetch: vi.fn() },
  unitsQuery: { data: [] as unknown[], isLoading: false },
  updateStatusMutation: { isPending: false, mutate: vi.fn() },
}));

vi.mock('@/features/properties/use-properties', () => ({
  useProperties: () => maintenanceMocks.propertiesQuery,
}));

vi.mock('@/features/units/use-units', () => ({
  useUnits: () => maintenanceMocks.unitsQuery,
}));

vi.mock('./use-maintenance', () => ({
  useCreateMaintenance: () => maintenanceMocks.createMutation,
  useMaintenance: () => maintenanceMocks.maintenanceQuery,
  useUpdateMaintenanceStatus: () => maintenanceMocks.updateStatusMutation,
}));

const maintenanceRow = {
  id: 'maintenance-1',
  property_id: 'property-1',
  unit_id: null,
  title: 'إصلاح المكيف',
  description: null,
  priority: 'urgent',
  status: 'in_progress',
  assigned_to: null,
  cost: 0,
  resolved_at: null,
  created_at: '2026-05-17T00:00:00.000Z',
  updated_at: '2026-05-17T00:00:00.000Z',
  deleted_at: null,
};

describe('MaintenancePage recovery states', () => {
  beforeEach(() => {
    maintenanceMocks.maintenanceQuery.data = [];
    maintenanceMocks.maintenanceQuery.error = null;
    maintenanceMocks.maintenanceQuery.isError = false;
    maintenanceMocks.maintenanceQuery.isLoading = false;
    maintenanceMocks.propertiesQuery.data = { rows: [] };
    maintenanceMocks.propertiesQuery.error = null;
    maintenanceMocks.propertiesQuery.isError = false;
    maintenanceMocks.propertiesQuery.isLoading = false;
    maintenanceMocks.unitsQuery.data = [];
  });

  it('renders Arabic maintenance status and priority labels', () => {
    maintenanceMocks.maintenanceQuery.data = [maintenanceRow];

    const html = renderToStaticMarkup(<MaintenancePage />);

    expect(html).toContain('إصلاح المكيف');
    expect(html).toContain('قيد التنفيذ');
    expect(html).toContain('عاجلة');
    expect(html).toContain('تم الحل');
  });

  it('renders a retryable load error state', () => {
    maintenanceMocks.maintenanceQuery.error = new Error('تعذر تحميل صيانة الاختبار');
    maintenanceMocks.maintenanceQuery.isError = true;

    const html = renderToStaticMarkup(<MaintenancePage />);

    expect(html).toContain('تعذر تحميل طلبات الصيانة');
    expect(html).toContain('تعذر تحميل صيانة الاختبار');
    expect(html).toContain('إعادة المحاولة');
  });
});
