import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { DataTable } from '@/components/shared/DataTable';
import { FormActions } from '@/components/shared/FormActions';
import { useCreateMaintenance, useMaintenance } from './use-maintenance';

const maintenanceSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().uuid('اختر الوحدة').nullable().optional(),
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
  const [error, setError] = useState('');
  return <div className='space-y-6' dir='rtl'>
    <Card><CardHeader><CardTitle>طلبات الصيانة</CardTitle></CardHeader><CardContent className='space-y-2'>
      <div className='flex gap-2'><select className='rounded border px-2' value={status} onChange={(e)=>setStatus(e.target.value as typeof status)}><option value='all'>كل الحالات</option><option value='open'>مفتوح</option><option value='in_progress'>قيد التنفيذ</option><option value='resolved'>تم الحل</option><option value='closed'>مغلق</option></select><input className='rounded border px-2' placeholder='property_id' value={propertyId} onChange={(e)=>{ setPropertyId(e.target.value); setError(''); }} /></div>
      {data.map((r) => <p key={r.id}>{r.title} — {r.status} — {r.priority}</p>)}
      <Button onClick={() => {
        if (!propertyId) {
          setError('يرجى اختيار العقار أولاً');
          return;
        }
        createMutation.mutate({ property_id: propertyId, unit_id: null, title: 'طلب جديد', description: null, priority: 'medium', status: 'open', assigned_to: null, cost: 0, resolved_at: null });
      }}>إضافة طلب صيانة</Button>
      {error ? <p className='text-sm text-red-600'>{error}</p> : null}
    </CardContent></Card>
  </div>;
}
