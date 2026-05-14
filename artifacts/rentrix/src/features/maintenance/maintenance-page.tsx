import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateMaintenance, useMaintenance } from './use-maintenance';

const maintenanceSchema = z.object({
  property_id: z.string().min(1, 'اختر العقار'),
  unit_id: z.string().nullable().optional().transform((val) => (val === '' ? null : val)),
  title: z.string().min(1, 'أدخل عنوان الطلب'),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

void zodResolver;
void maintenanceSchema;
void ({} as MaintenanceFormValues);

export function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [propertyFilterId, setPropertyFilterId] = useState('');

  const maintenanceQuery = useMaintenance(statusFilter, propertyFilterId);
  const propertiesQuery = useProperties({ search: '', status: 'all', page: 1, pageSize: 200 });
  const unitsQuery = useUnits(propertyFilterId);
  const createMutation = useCreateMaintenance();
  const [error, setError] = useState('');

  return (
    <div className='space-y-6' dir='rtl'>
      <Card>
        <CardHeader>
          <CardTitle>طلبات الصيانة</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          <div className='flex gap-2'>
            <select className='rounded border px-2' value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value='all'>كل الحالات</option>
              <option value='open'>مفتوح</option>
              <option value='in_progress'>قيد التنفيذ</option>
              <option value='resolved'>تم الحل</option>
              <option value='closed'>مغلق</option>
            </select>
            <input
              className='rounded border px-2'
              placeholder='property_id'
              value={propertyFilterId}
              onChange={(e) => {
                setPropertyFilterId(e.target.value);
                setError('');
              }}
            />
          </div>
          {data.map((r) => (
            <p key={r.id}>
              {r.title} — {r.status} — {r.priority}
            </p>
          ))}
          <Button
            onClick={() => {
              if (!propertyFilterId) {
                setError('يرجى اختيار العقار أولاً');
                return;
              }
              createMutation.mutate({
                property_id: propertyFilterId,
                unit_id: null,
                title: 'طلب جديد',
                description: null,
                priority: 'medium',
                status: 'open',
                assigned_to: null,
                cost: 0,
                resolved_at: null,
              });
            }}
          >
            إضافة طلب صيانة
          </Button>
          {error ? <p className='text-sm text-red-600'>{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
