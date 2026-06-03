import { Link } from '@tanstack/react-router';
import { Building2, DoorOpen, Home, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { RouteLoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProperties } from '@/features/properties/use-properties';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney, getCompanyLocale } from '@/lib/companyFormatters';
import type { Property, Unit } from '@/types/domain';
import { unitStatusLabels, unitStatusValues, type UnitStatus } from './unit-schema';
import { useAllUnits } from './use-units';

type OccupancyFilter = 'all' | 'occupied' | 'open';

const unitStatusTone: Record<UnitStatus, 'green' | 'blue' | 'gold' | 'gray'> = {
  available: 'green',
  occupied: 'blue',
  maintenance: 'gold',
  reserved: 'gray',
};

function money(value: number | null) {
  return value === null ? '—' : formatCompanyMoney(defaultCompanyLocalSettings, value);
}

function normalizedUnitStatus(unit: Unit): UnitStatus {
  return unitStatusValues.includes(unit.status as UnitStatus) ? (unit.status as UnitStatus) : 'available';
}

function buildPropertyMap(properties: Property[]) {
  return new Map(properties.map((property) => [property.id, property]));
}

function UnitMetric({ label, value, helper, icon: Icon }: Readonly<{ label: string; value: string; helper: string; icon: typeof DoorOpen }>) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-black text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export function UnitsPage() {
  const unitsQuery = useAllUnits();
  const propertiesQuery = useProperties({ page: 1, pageSize: 500, search: '', status: 'all' });
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [status, setStatus] = useState<'all' | UnitStatus>('all');
  const [occupancy, setOccupancy] = useState<OccupancyFilter>('all');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const units = unitsQuery.data ?? [];
  const properties = propertiesQuery.data?.rows ?? [];
  const propertyById = useMemo(() => buildPropertyMap(properties), [properties]);
  const locale = getCompanyLocale(defaultCompanyLocalSettings);

  const filteredUnits = useMemo(() => units.filter((unit) => {
    const unitStatus = normalizedUnitStatus(unit);
    const property = propertyById.get(unit.property_id);
    const haystack = `${unit.unit_number} ${unit.floor ?? ''} ${unit.notes ?? ''} ${property?.title ?? ''}`.toLowerCase();
    const matchesSearch = deferredSearch.length === 0 || haystack.includes(deferredSearch);
    const matchesProperty = propertyId === 'all' || unit.property_id === propertyId;
    const matchesStatus = status === 'all' || unitStatus === status;
    const matchesOccupancy = occupancy === 'all' || (occupancy === 'occupied' ? unitStatus === 'occupied' : unitStatus !== 'occupied');
    return matchesSearch && matchesProperty && matchesStatus && matchesOccupancy;
  }), [deferredSearch, occupancy, propertyById, propertyId, status, units]);

  if (unitsQuery.isLoading && propertiesQuery.isLoading) return <RouteLoadingState />;

  const occupiedCount = units.filter((unit) => normalizedUnitStatus(unit) === 'occupied').length;
  const availableCount = units.filter((unit) => normalizedUnitStatus(unit) === 'available').length;
  const expectedRent = units.reduce((total, unit) => total + (unit.rent_amount ?? 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">إدارة الوحدات</p>
          <h2 className="text-3xl font-black tracking-tight">الوحدات</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">عرض تشغيلي لكل الوحدات المسجلة مع روابط مباشرة للعقارات، مع إبقاء إضافة وتعديل الوحدات داخل صفحة العقار المرتبط.</p>
        </div>
        <Button asChild><Link to="/properties"><Building2 className="ml-2 size-4" />العقارات</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UnitMetric label="إجمالي الوحدات" value={units.length.toLocaleString(locale)} helper="كل الوحدات النشطة" icon={DoorOpen} />
        <UnitMetric label="الوحدات المشغولة" value={occupiedCount.toLocaleString(locale)} helper="حسب حالة الوحدة" icon={Home} />
        <UnitMetric label="الوحدات المتاحة" value={availableCount.toLocaleString(locale)} helper="جاهزة للتأجير" icon={DoorOpen} />
        <UnitMetric label="إجمالي الإيجار المتوقع" value={formatCompanyMoney(defaultCompanyLocalSettings, expectedRent)} helper="من قيم الإيجار المسجلة" icon={Building2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
          <CardDescription>صفّ الوحدات حسب العقار، الحالة، أو الإشغال دون تغيير البيانات.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-sm font-bold xl:col-span-2">
            <span>بحث</span>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="رقم الوحدة، الدور، العقار" />
            </div>
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>العقار</span>
            <Select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
              <option value="all">كل العقارات</option>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>الحالة</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | UnitStatus)}>
              <option value="all">كل الحالات</option>
              {unitStatusValues.map((value) => <option key={value} value={value}>{unitStatusLabels[value]}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>الإشغال</span>
            <Select value={occupancy} onChange={(event) => setOccupancy(event.target.value as OccupancyFilter)}>
              <option value="all">كل الوحدات</option>
              <option value="occupied">مشغولة فقط</option>
              <option value="open">غير مشغولة</option>
            </Select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل الوحدات</CardTitle>
          <CardDescription>{filteredUnits.length.toLocaleString(locale)} وحدة ضمن الفلاتر الحالية.</CardDescription>
        </CardHeader>
        <CardContent>
          {unitsQuery.isLoading || propertiesQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>
          ) : null}
          {unitsQuery.isError || propertiesQuery.isError ? <EmptyState title="تعذر تحميل الوحدات" description="أعد المحاولة بعد لحظات أو عدّل عوامل التصفية الحالية." role="alert" ariaLive="assertive" /> : null}
          {!unitsQuery.isLoading && !propertiesQuery.isLoading && !unitsQuery.isError && !propertiesQuery.isError && filteredUnits.length === 0 ? (
            <EmptyState title="لا توجد وحدات مطابقة" description="غيّر البحث أو الفلاتر لعرض وحدات أخرى، أو أضف وحدة من صفحة العقار المرتبط." action={<Button asChild><Link to="/properties">فتح العقارات</Link></Button>} />
          ) : null}
          {filteredUnits.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>العقار</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإيجار</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => {
                    const unitStatus = normalizedUnitStatus(unit);
                    const property = propertyById.get(unit.property_id);
                    return (
                      <TableRow key={unit.id}>
                        <TableCell className="font-black">{unit.unit_number}</TableCell>
                        <TableCell>{property ? <Link className="font-bold text-primary hover:underline" to="/properties/$propertyId" params={{ propertyId: property.id }}>{property.title}</Link> : '—'}</TableCell>
                        <TableCell>{unit.floor ?? '—'}</TableCell>
                        <TableCell><StatusBadge tone={unitStatusTone[unitStatus]}>{unitStatusLabels[unitStatus]}</StatusBadge></TableCell>
                        <TableCell dir="ltr" className="font-bold">{money(unit.rent_amount)}</TableCell>
                        <TableCell>{unit.notes ?? '—'}</TableCell>
                        <TableCell>{property ? <Button variant="secondary" asChild><Link to="/properties/$propertyId" params={{ propertyId: property.id }}>فتح العقار</Link></Button> : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
