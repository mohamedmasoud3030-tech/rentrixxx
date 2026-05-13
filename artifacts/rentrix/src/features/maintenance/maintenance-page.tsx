import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { DataTable } from '@/components/shared/DataTable';
import { FormActions } from '@/components/shared/FormActions';
import { useProperties } from '@/features/properties/use-properties';
import { useUnits } from '@/features/units/use-units';
import { useCreateMaintenance, useMaintenance } from './use-maintenance';

const maintenanceSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().uuid('اختر الوحدة').nullable().optional().transform((val) => val === '' ? null : val),
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().min(1, 'الوصف مطلوب'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export function MaintenancePage() {
  const [status, setStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');
  const { data = [] } = useMaintenance(status, propertyFilterId);
  const createMutation = useCreateMaintenance();
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { property_id: '', unit_id: null, title: '', description: '', priority: 'medium' },
  });
  const selectedPropertyId = useWatch({ control: form.control, name: 'property_id' });
  const { data: units = [] } = useUnits(selectedPropertyId || '');

  return <div className='space-y-6' dir='rtl'>
    <Card><CardHeader><CardTitle>طلبات الصيانة</CardTitle></CardHeader><CardContent className='space-y-2'>
      <div className='flex gap-2'><select className='rounded border px-2' value={status} onChange={(e)=>setStatus(e.target.value as typeof status)}><option value='all'>كل الحالات</option><option value='open'>مفتوح</option><option value='in_progress'>قيد التنفيذ</option><option value='resolved'>تم الحل</option><option value='closed'>مغلق</option></select><select className='rounded border px-2' value={propertyFilterId} onChange={(e)=>setPropertyFilterId(e.target.value)}><option value=''>كل العقارات</option>{properties?.rows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <DataTable
        rows={data}
        keyOf={(r) => r.id}
        columns={[
          { key: 'title', header: 'العنوان', render: (r) => r.title },
          { key: 'status', header: 'الحالة', render: (r) => r.status },
          { key: 'priority', header: 'الأولوية', render: (r) => r.priority },
        ]}
        empty={<EmptyState title='لا توجد طلبات صيانة' description='ابدأ بإضافة طلب جديد لهذا العقار.' />}
      />
      <form className='grid gap-2' onSubmit={form.handleSubmit((values) => createMutation.mutate({ ...values, status: 'open', assigned_to: null, cost: 0, resolved_at: null, unit_id: values.unit_id ?? null }))}>
        <select className='rounded border px-2 py-2' {...form.register('property_id')}>
          <option value=''>اختر العقار</option>
          {properties?.rows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {form.formState.errors.property_id ? <p className='text-sm text-red-600'>{form.formState.errors.property_id.message}</p> : null}
        <select className='rounded border px-2 py-2' {...form.register('unit_id')}>
          <option value=''>بدون وحدة</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
        </select>
        <input className='rounded border px-2 py-2' {...form.register('title')} placeholder='عنوان الطلب' />
        {form.formState.errors.title ? <p className='text-sm text-red-600'>{form.formState.errors.title.message}</p> : null}
        <textarea className='rounded border px-2 py-2' {...form.register('description')} placeholder='وصف المشكلة' />
        {form.formState.errors.description ? <p className='text-sm text-red-600'>{form.formState.errors.description.message}</p> : null}
        <select className='rounded border px-2 py-2' {...form.register('priority')}><option value='low'>منخفض</option><option value='medium'>متوسط</option><option value='high'>عالي</option><option value='urgent'>عاجل</option></select>
        <FormActions submitLabel='إضافة طلب صيانة' isSubmitting={createMutation.isPending} onSubmit={form.handleSubmit((values) => createMutation.mutate({ ...values, status: 'open', assigned_to: null, cost: 0, resolved_at: null, unit_id: values.unit_id ?? null }))} />
      </form>
    </CardContent></Card>
  </div>;
}
