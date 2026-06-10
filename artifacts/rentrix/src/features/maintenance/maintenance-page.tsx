import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Clock, Flame, PlusCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
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

const maintenanceStatusTone = {
  open: 'blue',
  in_progress: 'gold',
  resolved: 'green',
  closed: 'gray',
} as const;

const maintenancePriorityLabels = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
} as const;

const maintenancePriorityTone = {
  low: 'gray',
  medium: 'blue',
  high: 'gold',
  urgent: 'red',
} as const;

function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type MaintenanceAction = Readonly<{ label: string; status: Exclude<MaintenanceStatusFilter, 'all'> }>;

const summaryCards = [
  { key: 'total', label: 'إجمالي الطلبات', icon: Wrench, color: 'text-primary' },
  { key: 'open', label: 'طلبات مفتوحة', icon: AlertCircle, color: 'text-blue-500' },
  { key: 'inProgress', label: 'قيد التنفيذ', icon: Clock, color: 'text-amber-500' },
  { key: 'urgent', label: 'عاجلة', icon: Flame, color: 'text-red-500' },
] as const;

function getMaintenanceStatusActions(status: keyof typeof maintenanceStatusLabels): MaintenanceAction[] {
  if (status === 'open') return [{ label: 'بدء التنفيذ', status: 'in_progress' }];
  if (status === 'in_progress') return [{ label: 'تم الحل', status: 'resolved' }];
  if (status === 'resolved') return [{ label: 'إغلاق', status: 'closed' }];
  return [];
}

export function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriorityFilter>('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');
  const [showForm, setShowForm] = useState(false);

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
  const isLoading = maintenanceQuery.isLoading || propertiesQuery.isLoading;

  const retryMaintenanceWorkspace = async () => {
    await Promise.all([maintenanceQuery.refetch(), propertiesQuery.refetch()]);
  };

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
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="rounded-2xl">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-3xl font-black">
                      {isLoading ? <Skeleton className="mt-2 h-8 w-12" /> : maintenanceSummary[card.key]}
                    </p>
                  </div>
                  <Icon className={`size-8 opacity-20 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + add button */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={String(statusFilter)} onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatusFilter)}>
            <option value="all">كل الحالات</option>
            <option value="open">مفتوح</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="resolved">تم الحل</option>
            <option value="closed">مغلق</option>
          </Select>
          <Select value={String(priorityFilter)} onChange={(e) => setPriorityFilter(e.target.value as MaintenancePriorityFilter)}>
            <option value="all">كل الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </Select>
          <Select value={propertyFilterId} onChange={(e) => setPropertyFilterId(e.target.value)}>
            <option value="">كل العقارات</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
        </div>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          <PlusCircle className="ml-2 size-4" />
          {showForm ? 'إلغاء' : 'طلب صيانة جديد'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">طلب صيانة جديد</CardTitle>
            <CardDescription>أدخل تفاصيل الطلب ثم اضغط حفظ.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-1">
                <Select {...form.register('property_id')}>
                  <option value="">اختر العقار</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
                {form.formState.errors.property_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.property_id.message}</p>
                )}
              </div>

              <Select {...form.register('unit_id')}>
                <option value="">بدون وحدة</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_number}</option>)}
              </Select>

              <div className="space-y-1 sm:col-span-2">
                <Input placeholder="عنوان الطلب" {...form.register('title')} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Textarea placeholder="الوصف (اختياري)" className="min-h-20" {...form.register('description')} />
              </div>

              <Select {...form.register('priority')}>
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </Select>

              <Button type="submit" disabled={createMutation.isPending} className="sm:self-end">
                {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : hasLoadError ? (
        <EmptyState
          title="تعذر تحميل طلبات الصيانة"
          description={getLoadErrorMessage(loadError, 'حدث خطأ غير متوقع.')}
          action={<Button type="button" onClick={retryMaintenanceWorkspace}>إعادة المحاولة</Button>}
        />
      ) : (
        <DataTable
          rows={filteredMaintenanceRows}
          keyOf={(row) => row.id}
          columns={[
            { key: 'title', header: 'العنوان', render: (row) => <span className="font-medium">{row.title}</span> },
            { key: 'location', header: 'الموقع', render: (row) => buildMaintenanceLocationLabel(row, properties, allUnits) },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge tone={maintenanceStatusTone[row.status as keyof typeof maintenanceStatusTone] ?? 'gray'}>{maintenanceStatusLabels[row.status as keyof typeof maintenanceStatusLabels] ?? row.status ?? '—'}</StatusBadge>
              ),
            },
            {
              key: 'priority',
              header: 'الأولوية',
              render: (row) => (
                <StatusBadge tone={maintenancePriorityTone[row.priority as keyof typeof maintenancePriorityTone] ?? 'gray'}>{maintenancePriorityLabels[row.priority as keyof typeof maintenancePriorityLabels] ?? row.priority ?? '—'}</StatusBadge>
              ),
            },
            {
              key: 'actions',
              header: 'الإجراء',
              render: (row) => {
                const actions = getMaintenanceStatusActions((row.status ?? '') as keyof typeof maintenanceStatusLabels);
                if (!actions.length) return <span className="flex items-center gap-1 text-muted-foreground text-xs"><CheckCircle2 className="size-3.5" />مكتمل</span>;
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
      )}
    </div>
  );
}

export default MaintenancePage;
