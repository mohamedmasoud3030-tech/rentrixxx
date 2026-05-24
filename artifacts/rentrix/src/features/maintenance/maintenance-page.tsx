import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { canPrintOperationalReport, runOperationalPrint } from '@/lib/operationalPrint';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/shared/DataTable';
import { useProperties } from '@/features/properties/use-properties';
import { useAllUnits, useUnits } from '@/features/units/use-units';
import { useMaintenance, useCreateMaintenance, useUpdateMaintenanceStatus } from './use-maintenance';
import {
  buildMaintenanceLocationLabel,
  filterMaintenanceRequests,
  summarizeMaintenanceRequests,
  type MaintenancePriorityFilter,
  type MaintenanceStatusFilter,
} from './maintenance-helpers';

const schema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().nullable().optional().transform((val) => (val === '' ? null : val)),
  title: z.string().min(1, 'أدخل عنوان الطلب'),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormValues = z.infer<typeof schema>;

const maintenanceStatusLabels = {
  open: 'مفتوح',
  in_progress: 'قيد التنفيذ',
  resolved: 'تم الحل',
  closed: 'مغلق',
} as const;

const maintenancePriorityLabels = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
} as const;

const maintenanceStatusTone: Record<keyof typeof maintenanceStatusLabels, StatusBadgeTone> = {
  open: 'gold',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'green',
};

const maintenancePriorityTone: Record<keyof typeof maintenancePriorityLabels, StatusBadgeTone> = {
  low: 'gray',
  medium: 'blue',
  high: 'gold',
  urgent: 'red',
};

function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type MaintenanceAction = Readonly<{ label: string; status: Exclude<MaintenanceStatusFilter, 'all'> }>;

const summaryCards = [
  { key: 'total', label: 'إجمالي الطلبات' },
  { key: 'open', label: 'طلبات مفتوحة' },
  { key: 'inProgress', label: 'قيد التنفيذ' },
  { key: 'urgent', label: 'عاجلة' },
] as const;

function getMaintenanceStatusActions(status: keyof typeof maintenanceStatusLabels): MaintenanceAction[] {
  if (status === 'open') {
    return [{ label: 'بدء التنفيذ', status: 'in_progress' }];
  }
  if (status === 'in_progress') {
    return [{ label: 'تم الحل', status: 'resolved' }];
  }
  if (status === 'resolved') {
    return [{ label: 'إغلاق', status: 'closed' }];
  }
  return [];
}

export function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriorityFilter>('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');

  const maintenanceQuery = useMaintenance(statusFilter, propertyFilterId);
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 200 });
  const createMutation = useCreateMaintenance();
  const updateStatusMutation = useUpdateMaintenanceStatus();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { property_id: '', unit_id: null, title: '', description: '', priority: 'medium' },
  });

  const formPropertyId = form.watch('property_id');
  const unitsQuery = useUnits(formPropertyId);
  const allUnitsQuery = useAllUnits();

  const properties = propertiesQuery.data?.rows ?? [];
  const units = unitsQuery.data ?? [];
  const allUnits = allUnitsQuery.data ?? [];
  const maintenanceRows = maintenanceQuery.data ?? [];
  const filteredMaintenanceRows = useMemo(
    () => filterMaintenanceRequests(maintenanceRows, { status: statusFilter, priority: priorityFilter, propertyId: propertyFilterId }),
    [maintenanceRows, priorityFilter, propertyFilterId, statusFilter],
  );
  const maintenanceSummary = useMemo(() => summarizeMaintenanceRequests(filteredMaintenanceRows), [filteredMaintenanceRows]);
  const loadError = maintenanceQuery.error ?? propertiesQuery.error;
  const hasLoadError = maintenanceQuery.isError || propertiesQuery.isError;
  const isWorkspaceLoading = maintenanceQuery.isLoading || propertiesQuery.isLoading;
  const retryMaintenanceWorkspace = async () => {
    await Promise.all([maintenanceQuery.refetch(), propertiesQuery.refetch()]);
  };

  const propertyOptions = properties.map((p) => (
    <option key={p.id} value={p.id}>{p.title}</option>
  ));

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        property_id: values.property_id,
        unit_id: values.unit_id,
        title: values.title,
        description: values.description ?? null,
        priority: values.priority,
        status: 'open',
        assigned_to: null,
        cost: 0,
        resolved_at: null,
      },
      {
        onSuccess: () => {
          form.reset({ property_id: '', unit_id: null, title: '', description: '', priority: 'medium' });
        },
      },
    );
  };

  const printSummary = () => {
    const errorMessage = runOperationalPrint(filteredMaintenanceRows.length > 0, isWorkspaceLoading, hasLoadError, {
      title: 'ملخص الصيانة',
      generatedAt: new Date().toLocaleDateString('ar-OM'),
      tables: [{
        title: 'طلبات الصيانة',
        columns: ['العنوان', 'العقار', 'الحالة', 'الأولوية'],
        rows: filteredMaintenanceRows.slice(0, 40).map((row) => [
          row.title,
          buildMaintenanceLocationLabel(row, properties, allUnits),
          maintenanceStatusLabels[row.status],
          maintenancePriorityLabels[row.priority],
        ]),
      }],
    });
    if (errorMessage) globalThis.alert(errorMessage);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={printSummary}
          disabled={!canPrintOperationalReport(filteredMaintenanceRows.length > 0, isWorkspaceLoading, hasLoadError)}
        >
          <Printer className="ms-2 size-4" />طباعة ملخص الصيانة
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Select aria-label="تصفية طلبات الصيانة حسب الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatusFilter)}>
          <option value="all">كل الحالات</option>
          <option value="open">مفتوح</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="resolved">تم الحل</option>
          <option value="closed">مغلق</option>
        </Select>
        <Select aria-label="تصفية طلبات الصيانة حسب الأولوية" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as MaintenancePriorityFilter)}>
          <option value="all">كل الأولويات</option>
          <option value="low">منخفضة</option>
          <option value="medium">متوسطة</option>
          <option value="high">عالية</option>
          <option value="urgent">عاجلة</option>
        </Select>
        <Select aria-label="تصفية طلبات الصيانة حسب العقار" value={propertyFilterId} onChange={(e) => setPropertyFilterId(e.target.value)}>
          <option value="">كل العقارات</option>
          {propertyOptions}
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.key} className="rounded border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{maintenanceSummary[card.key]}</p>
          </div>
        ))}
      </div>

      <form className="grid gap-3 rounded border p-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <Select aria-label="اختيار العقار" className="sm:col-span-2" {...form.register('property_id')}>
          <option value="">اختر العقار</option>
          {propertyOptions}
        </Select>
        {form.formState.errors.property_id ? <p className="text-sm text-red-600">{form.formState.errors.property_id.message}</p> : null}

        <Select aria-label="اختيار الوحدة" {...form.register('unit_id')}>
          <option value="">بدون وحدة</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
          ))}
        </Select>

        <Input aria-label="عنوان طلب الصيانة" placeholder="عنوان الطلب" {...form.register('title')} />
        {form.formState.errors.title ? <p className="text-sm text-red-600">{form.formState.errors.title.message}</p> : null}

        <Textarea aria-label="وصف طلب الصيانة (اختياري)" className="sm:col-span-2" placeholder="الوصف (اختياري)" {...form.register('description')} />

        <Select aria-label="أولوية طلب الصيانة" {...form.register('priority')}>
          <option value="low">منخفضة</option>
          <option value="medium">متوسطة</option>
          <option value="high">عالية</option>
          <option value="urgent">عاجلة</option>
        </Select>

        <Button className="sm:col-span-2" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جارٍ الحفظ...' : 'إضافة طلب صيانة'}</Button>
      </form>

      {isWorkspaceLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12" />)}</div>
      ) : null}
      {!isWorkspaceLoading && hasLoadError ? (
        <EmptyState
          title="تعذر تحميل طلبات الصيانة"
          description={getLoadErrorMessage(loadError, 'حدث خطأ غير متوقع أثناء تحميل طلبات الصيانة.')}
          action={<Button type="button" onClick={retryMaintenanceWorkspace}>إعادة المحاولة</Button>}
        />
      ) : null}
      {!isWorkspaceLoading && !hasLoadError ? (
        <DataTable
          rows={filteredMaintenanceRows}
          keyOf={(row) => row.id}
          columns={[
            { key: 'title', header: 'العنوان', render: (row) => row.title },
            { key: 'location', header: 'العقار / الوحدة', render: (row) => buildMaintenanceLocationLabel(row, properties, allUnits) },
            { key: 'status', header: 'الحالة', render: (row) => <StatusBadge tone={maintenanceStatusTone[row.status]}>{maintenanceStatusLabels[row.status]}</StatusBadge> },
            { key: 'priority', header: 'الأولوية', render: (row) => <StatusBadge tone={maintenancePriorityTone[row.priority]}>{maintenancePriorityLabels[row.priority]}</StatusBadge> },
            {
              key: 'actions',
              header: 'الإجراء التالي',
              render: (row) => {
                const actions = getMaintenanceStatusActions(row.status);
                if (!actions.length) {
                  return '—';
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={`${row.id}-${action.status}`}
                        type="button"
                        variant="secondary"
                        className="min-h-8 px-3 text-xs"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ requestId: row.id, status: action.status })}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                );
              },
            },
          ]}
          empty={<EmptyState title="لا توجد طلبات صيانة" description="غيّر عوامل التصفية أو أضف طلب صيانة جديد للبدء." />}
        />
      ) : null}
    </div>
  );
}

export default MaintenancePage;
