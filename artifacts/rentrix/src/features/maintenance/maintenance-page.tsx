import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { useMaintenance, useCreateMaintenance } from './useMaintenance';
import { useProperties } from '@/features/properties/useProperties';
import { useUnits } from '@/features/units/useUnits';

const schema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().nullable().optional()
    .transform(v => v === '' ? null : v),
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().optional(),
  priority: z.enum(['low','medium','high','urgent']),
});

type FormValues = z.infer<typeof schema>;

export function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<
    'all'|'open'|'in_progress'|'resolved'|'closed'
  >('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');

  const { data: requests = [] } = useMaintenance(statusFilter, propertyFilterId);
  const { data: propertiesData } = useProperties({ search:'', status:'all', page:1, pageSize:200 });
  const properties = propertiesData?.rows ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority:'medium', unit_id:'' },
  });

  const formPropertyId = form.watch('property_id');
  const { data: units = [] } = useUnits(formPropertyId);
  const createMutation = useCreateMaintenance();

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      { ...values, status:'open', assigned_to:null, cost:0, resolved_at:null },
      { onSuccess: () => form.reset({ priority:'medium', unit_id:'' }) }
    );
  };

  const propertyOptions = properties.map(p => (
    <option key={p.id} value={p.id}>{p.title}</option>
  ));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">طلبات الصيانة</h1>
      <div className="flex gap-3">
        <select className="rounded border px-3 py-2"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">كل الحالات</option>
          <option value="open">مفتوح</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="resolved">تم الحل</option>
          <option value="closed">مغلق</option>
        </select>
        <select className="rounded border px-3 py-2"
          value={propertyFilterId}
          onChange={e => setPropertyFilterId(e.target.value)}>
          <option value="">كل العقارات</option>
          {propertyOptions}
        </select>
      </div>
      {requests.length === 0 ? (
        <EmptyState title="لا توجد طلبات" description="أضف طلب صيانة جديد" />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-right">العنوان</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2 text-right">الأولوية</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{r.title}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">إضافة طلب صيانة</h2>
        <select className="w-full rounded border px-3 py-2"
          {...form.register('property_id')}>
          <option value="">اختر العقار</option>
          {propertyOptions}
        </select>
        {form.formState.errors.property_id && (
          <p className="text-red-600 text-sm">
            {form.formState.errors.property_id.message}
          </p>
        )}
        <select className="w-full rounded border px-3 py-2"
          {...form.register('unit_id')}>
          <option value="">بدون وحدة</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.unit_number}</option>
          ))}
        </select>
        <input className="w-full rounded border px-3 py-2"
          placeholder="عنوان الطلب"
          {...form.register('title')} />
        {form.formState.errors.title && (
          <p className="text-red-600 text-sm">
            {form.formState.errors.title.message}
          </p>
        )}
        <textarea className="w-full rounded border px-3 py-2"
          placeholder="وصف المشكلة"
          {...form.register('description')} />
        <select className="w-full rounded border px-3 py-2"
          {...form.register('priority')}>
          <option value="low">منخفض</option>
          <option value="medium">متوسط</option>
          <option value="high">عالي</option>
          <option value="urgent">عاجل</option>
        </select>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'جاري الحفظ...' : 'إضافة طلب'}
        </Button>
      </form>
    </div>
  );
}


export default MaintenancePage;
