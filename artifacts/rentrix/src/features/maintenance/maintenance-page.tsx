import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { DataTable } from '@/components/shared/DataTable';
import { useProperties } from '@/features/properties/use-properties';
import { useUnits } from '@/features/units/use-units';
import { useMaintenance, useCreateMaintenance } from './use-maintenance';

const schema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().nullable().optional().transform((val) => (val === '' ? null : val)),
  title: z.string().min(1, 'أدخل عنوان الطلب'),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type FormValues = z.infer<typeof schema>;

void zodResolver;
void maintenanceSchema;
void ({} as MaintenanceFormValues);

export function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');

  const maintenanceQuery = useMaintenance(statusFilter, propertyFilterId);
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 200 });
  const createMutation = useCreateMaintenance();

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { property_id: '', unit_id: null, title: '', description: '', priority: 'medium' },
  });

  const formPropertyId = form.watch('property_id');
  const unitsQuery = useUnits(formPropertyId);

  const properties = propertiesQuery.data?.rows ?? [];
  const units = unitsQuery.data ?? [];
  const maintenanceRows = maintenanceQuery.data ?? [];

  const propertyOptions = properties.map((p) => (
    <option key={p.id} value={p.id}>{p.title}</option>
  ));

  const onSubmit = (values: MaintenanceFormValues) => {
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-2 md:grid-cols-2">
        <select className="rounded border px-2 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">كل الحالات</option>
          <option value="open">مفتوح</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="resolved">تم الحل</option>
          <option value="closed">مغلق</option>
        </select>
        <select className="rounded border px-2 py-2" value={propertyFilterId} onChange={(e) => setPropertyFilterId(e.target.value)}>
          <option value="">كل العقارات</option>
          {propertyOptions}
        </select>
      </div>

      <form className="grid gap-3 rounded border p-4" onSubmit={form.handleSubmit(onSubmit)}>
        <select className="rounded border px-2 py-2" {...form.register('property_id')}>
          <option value="">اختر العقار</option>
          {propertyOptions}
        </select>
        {form.formState.errors.property_id ? <p className="text-sm text-red-600">{form.formState.errors.property_id.message}</p> : null}

        <select className="rounded border px-2 py-2" {...form.register('unit_id')}>
          <option value="">بدون وحدة</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
          ))}
        </select>

        <input className="rounded border px-2 py-2" placeholder="عنوان الطلب" {...form.register('title')} />
        {form.formState.errors.title ? <p className="text-sm text-red-600">{form.formState.errors.title.message}</p> : null}

        <textarea className="rounded border px-2 py-2" placeholder="الوصف (اختياري)" {...form.register('description')} />

        <select className="rounded border px-2 py-2" {...form.register('priority')}>
          <option value="low">منخفضة</option>
          <option value="medium">متوسطة</option>
          <option value="high">عالية</option>
          <option value="urgent">عاجلة</option>
        </select>

        <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'جارٍ الحفظ...' : 'إضافة طلب صيانة'}</Button>
      </form>

      <DataTable
        rows={maintenanceRows}
        keyOf={(row) => row.id}
        columns={[
          { key: 'title', header: 'العنوان', render: (row) => row.title },
          { key: 'status', header: 'الحالة', render: (row) => row.status },
          { key: 'priority', header: 'الأولوية', render: (row) => row.priority },
        ]}
        empty={<EmptyState title="لا توجد طلبات صيانة" description="أضف طلب صيانة جديد للبدء." />}
      />
    </div>
  );
}


export default MaintenancePage;
