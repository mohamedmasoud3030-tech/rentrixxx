import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { UnitsList } from '@/features/units/units-list';
import { propertyStatusLabels } from './property-schema';
import { useProperty } from './use-properties';

function money(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value);
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

export function PropertyDetailPage() {
  const params = useParams({ strict: false });
  const propertyId = typeof params.propertyId === 'string' ? params.propertyId : '';
  const propertyQuery = useProperty(propertyId);

  if (propertyQuery.isLoading) return <RouteLoadingState />;
  if (!propertyQuery.data) return <EmptyState title="العقار غير موجود" description="ربما تم حذف العقار أو لا تملك صلاحية الوصول إليه." />;

  const property = propertyQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">تفاصيل العقار</p>
          <h2 className="text-2xl font-black">{property.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild><Link to="/properties"><ArrowRight className="ml-2 size-4" />العودة</Link></Button>
          <Button asChild><Link to="/properties/$propertyId/edit" params={{ propertyId }}><Edit className="ml-2 size-4" />تعديل</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات العقار</CardTitle>
          <CardDescription>كل الحقول الأساسية المخزنة في Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="النوع" value={property.type} />
          <InfoItem label="الحالة" value={propertyStatusLabels[property.status]} />
          <InfoItem label="المالك" value={property.owner_name ?? '—'} />
          <InfoItem label="قيمة الشراء" value={money(property.purchase_value)} />
          <InfoItem label="القيمة الحالية" value={money(property.current_value)} />
          <InfoItem label="تاريخ الإنشاء" value={new Date(property.created_at).toLocaleDateString('ar')} />
          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">ملاحظات</p>
            <p className="mt-1 leading-7">{property.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <UnitsList propertyId={property.id} />
    </div>
  );
}
