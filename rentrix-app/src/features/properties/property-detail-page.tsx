import { Link, useParams } from '@tanstack/react-router';
import { Edit } from 'lucide-react';
import { AsyncContentState } from '@/components/async-content-state';
import { EntityDetailHeader } from '@/components/layout/entity-detail-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { UnitsList } from '@/features/units/units-list';
import { useUnits } from '@/features/units/use-units';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyDate, formatCompanyMoney, getCompanyLocale } from '@/lib/companyFormatters';
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


// Translate the most common English/raw property-type inputs that legacy
// data may have into Arabic, without auto-translating arbitrary user
// input. Anything not in the map is shown verbatim so users still see
// what they typed.
const propertyTypeAliases: Readonly<Record<string, string>> = {
  'building': 'مبنى',
  'Building': 'مبنى',
  'BUILDING': 'مبنى',
};

function translatePropertyType(value: string): string {
  const trimmed = value.trim();
  return propertyTypeAliases[trimmed] ?? trimmed;
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

  const property = propertyQuery.data;

  return (
    <AsyncContentState
      status={propertyQuery.isLoading ? 'loading' : propertyQuery.isError ? 'error' : !property ? 'empty' : 'ready'}
      error={propertyQuery.error}
      errorTitle="تعذر تحميل العقار"
      errorAction={<Button onClick={() => propertyQuery.refetch()}>إعادة المحاولة</Button>}
      emptyTitle="العقار غير موجود"
      emptyDescription="ربما تم حذف العقار أو لا تملك صلاحية الوصول إليه."
    >
    {property && (
    <div className="space-y-6">
      <EntityDetailHeader
        title={property.title ?? 'عقار'}
        subtitle={property.address ?? undefined}
        backTo="/properties"
        backLabel="العقارات"
        status={<StatusBadge tone={propertyStatusTone[property.status]}>{propertyStatusLabels[property.status]}</StatusBadge>}
        actions={
          <Button asChild>
            <Link to="/properties/$propertyId/edit" params={{ propertyId }}>
              <Edit className="me-2 size-4" />تعديل
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>معلومات العقار</CardTitle>
          <CardDescription>البيانات الأساسية للعقار مع معلومات المالك وقيم الشراء والتقييم.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="النوع" value={translatePropertyType(property.type)} />
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
          {(() => { const unitSummary = summarizePropertyUnits(unitsQuery.data ?? []); return (<>
            <InfoItem label="إجمالي الوحدات" value={count(unitSummary.totalUnits)} />
            <InfoItem label="الوحدات المتاحة" value={count(unitSummary.availableUnits)} />
            <InfoItem label="الوحدات المشغولة" value={count(unitSummary.occupiedUnits)} />
            <InfoItem label="وحدات الصيانة" value={count(unitSummary.maintenanceUnits)} />
            <InfoItem label="الوحدات المحجوزة" value={count(unitSummary.reservedUnits)} />
            <InfoItem label="إجمالي الإيجار المتوقع" value={formatCompanyMoney(defaultCompanyLocalSettings, unitSummary.expectedRentTotal)} />
          </>); })()}
        </CardContent>
      </Card>

      <UnitsList propertyId={property.id} unitsQuery={unitsQuery} />
    </div>
    )}
    </AsyncContentState>
  );
}
