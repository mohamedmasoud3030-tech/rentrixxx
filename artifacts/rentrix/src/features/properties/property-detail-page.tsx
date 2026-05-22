import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { UnitsList } from '@/features/units/units-list';
import { useUnits } from '@/features/units/use-units';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyDate, formatCompanyMoney, getCompanyLocale } from '@lib/format';
import { propertyStatusLabels } from './property-schema';
import { summarizePropertyUnits } from './property-unit-summary';
import { useProperty } from './use-properties';

const propertyStatusTone = { active: 'green', inactive: 'gray', maintenance: 'gold', sold: 'blue' } as const;
const companyLocale = getCompanyLocale(defaultCompanyLocalSettings);

function money(value: number | null) {
  if (value === null) return '—';
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

function count(value: number) {
  return value.toLocaleString(companyLocale);
}

function InfoItem({ label, value }: Readonly<{ label: string; value: string }>) {
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
  const unitsQuery = useUnits(propertyId);

  if (propertyQuery.isLoading) return <RouteLoadingState />;
  if (!propertyQuery.data) return <EmptyState title="العقار غير موجود" description="ربما تم حذف العقار أو لا تملك صلاحية الوصول إليه." />;

  const property = propertyQuery.data;
  const unitSummary = summarizePropertyUnits(unitsQuery.data ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">تفاصيل العقار</p>
          <h2 className="text-2xl font-black">{property.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild><Link to="/properties"><ArrowRight className="ms-2 size-4" />العودة</Link></Button>
          <Button asChild><Link to="/properties/$propertyId/edit" params={{ propertyId }}><Edit className="ms-2 size-4" />تعديل</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات العقار</CardTitle>
          <CardDescription>كل الحقول الأساسية المخزنة في Supabase، مع إبقاء اسم المالك كحقل عرض نصي خفيف.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="النوع" value={property.type} />
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold text-muted-foreground">الحالة</p>
            <div className="mt-2"><StatusBadge tone={propertyStatusTone[property.status]}>{propertyStatusLabels[property.status]}</StatusBadge></div>
          </div>
          <InfoItem label="اسم المالك للعرض" value={property.owner_name ?? '—'} />
          <InfoItem label="قيمة الشراء" value={money(property.purchase_value)} />
          <InfoItem label="القيمة الحالية" value={money(property.current_value)} />
          <InfoItem label="تاريخ الإنشاء" value={formatCompanyDate(defaultCompanyLocalSettings, property.created_at)} />
          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground">ملاحظات</p>
            <p className="mt-1 leading-7">{property.notes ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ملخص الوحدات</CardTitle>
          <CardDescription>مؤشرات قراءة فقط محسوبة من الوحدات المسجلة لهذا العقار.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <InfoItem label="إجمالي الوحدات" value={count(unitSummary.totalUnits)} />
          <InfoItem label="الوحدات المتاحة" value={count(unitSummary.availableUnits)} />
          <InfoItem label="الوحدات المشغولة" value={count(unitSummary.occupiedUnits)} />
          <InfoItem label="وحدات الصيانة" value={count(unitSummary.maintenanceUnits)} />
          <InfoItem label="الوحدات المحجوزة" value={count(unitSummary.reservedUnits)} />
          <InfoItem label="إجمالي الإيجار المتوقع" value={formatCompanyMoney(defaultCompanyLocalSettings, unitSummary.expectedRentTotal)} />
        </CardContent>
      </Card>

      <UnitsList propertyId={property.id} unitsQuery={unitsQuery} />
    </div>
  );
}
