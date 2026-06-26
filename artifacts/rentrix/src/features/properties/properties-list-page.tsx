import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, Edit, Eye, Grid3x3, List, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PropertyFormModal } from './property-form-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PropertyCard } from '@/components/ui/property-card';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import { propertyStatusLabels, propertyStatusValues } from './property-schema';
import { useProperties, useSoftDeleteProperty } from './use-properties';
import type { PropertyStatusFilter } from './property-service';

const pageSize = 10;
const propertyStatusTone = { active: 'green', inactive: 'gray', maintenance: 'gold', sold: 'blue' } as const;

function money(value: number | null) {
  if (value === null) return '—';
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

export function PropertiesListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PropertyStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() =>
    window.innerWidth < 768 ? 'cards' : 'table',
  );
  const params = useMemo(() => ({ search, status, page, pageSize }), [page, search, status]);
  const propertiesQuery = useProperties(params);
  const deleteMutation = useSoftDeleteProperty();
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil((propertiesQuery.data?.count ?? 0) / pageSize));
  const hasFilterValues = search.trim().length > 0 || status !== 'all';

  const handleArchiveProperty = async (propertyId: string, title: string) => {
    const shouldArchive = globalThis.confirm(`سيتم أرشفة العقار "${title}" وإخفاؤه من القوائم النشطة. هل تريد المتابعة؟`);
    if (!shouldArchive) return;
    await deleteMutation.mutateAsync(propertyId);
  };

  const properties = propertiesQuery.data?.rows ?? [];

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">العقارات</h2>
            <p className="text-sm text-muted-foreground">إدارة العقارات والوحدات المرتبطة</p>
          </div>
          <Button onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
            <Plus className="size-4" />إضافة عقار
          </Button>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Input
                aria-label="بحث العقارات"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="بحث بالاسم أو العنوان..."
              />
              <Select
                aria-label="الحالة"
                value={status}
                onChange={(event) => { setStatus(event.target.value as PropertyStatusFilter); setPage(1); }}
                className="w-36"
              >
                <option value="all">كل الحالات</option>
                {propertyStatusValues.map((item) => <option key={item} value={item}>{propertyStatusLabels[item]}</option>)}
              </Select>
              <div className="hidden items-center gap-1 rounded-xl border border-border p-1 md:flex">
                <Button
                  type="button"
                  variant="ghost"
                  className={viewMode === 'cards' ? 'min-h-0 size-9 bg-primary px-0 py-0 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'min-h-0 size-9 px-0 py-0 text-muted-foreground'}
                  onClick={() => setViewMode('cards')}
                  aria-label="عرض البطاقات"
                  aria-pressed={viewMode === 'cards'}
                >
                  <Grid3x3 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={viewMode === 'table' ? 'min-h-0 size-9 bg-primary px-0 py-0 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'min-h-0 size-9 px-0 py-0 text-muted-foreground'}
                  onClick={() => setViewMode('table')}
                  aria-label="عرض الجدول"
                  aria-pressed={viewMode === 'table'}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {propertiesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />)}
          </div>
        ) : null}

        {!propertiesQuery.isLoading && propertiesQuery.isError ? (
          <EmptyState
            title="تعذر تحميل قائمة العقارات"
            description="حدث خطأ أثناء تحميل البيانات."
            role="alert"
            ariaLive="assertive"
            action={<Button onClick={() => propertiesQuery.refetch()}>إعادة المحاولة</Button>}
          />
        ) : null}

        {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <Building2 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <p className="font-bold text-muted-foreground">
              {hasFilterValues ? 'لا توجد نتائج مطابقة للبحث' : 'لم تُضف عقارات بعد'}
            </p>
            {!hasFilterValues ? (
              <Button className="mt-4" onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
                إضافة أول عقار
              </Button>
            ) : null}
          </div>
        ) : null}

        {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length > 0 && viewMode === 'cards' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <div key={property.id} className="group relative">
                <PropertyCard
                  id={property.id}
                  title={property.title ?? 'عقار'}
                  address={property.address}
                  status={property.status}
                  formatMoney={money}
                  onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: property.id } })}
                />
                <div className="absolute left-3 top-3 hidden gap-1.5 md:group-hover:flex">
                  <Button asChild variant="secondary" className="min-h-0 size-8 px-0 py-0" aria-label={`عرض ${property.title ?? 'العقار'}`}>
                    <Link to="/properties/$propertyId" params={{ propertyId: property.id }}><Eye className="size-3.5" /></Link>
                  </Button>
                  <Button variant="secondary" className="min-h-0 size-8 px-0 py-0" aria-label={`تعديل ${property.title ?? 'العقار'}`} onClick={() => { setEditPropertyId(property.id); setModalOpen(true); }}>
                    <Edit className="size-3.5" />
                  </Button>
                  <Button variant="danger" className="min-h-0 size-8 px-0 py-0" aria-label={`أرشفة ${property.title ?? 'العقار'}`} onClick={() => handleArchiveProperty(property.id, property.title ?? 'عقار')} disabled={deleteMutation.isPending}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 md:hidden">
                  <Button asChild variant="secondary" className="min-h-11 px-2 text-xs">
                    <Link to="/properties/$propertyId" params={{ propertyId: property.id }}><Eye className="size-3.5" />عرض</Link>
                  </Button>
                  <Button variant="secondary" className="min-h-11 px-2 text-xs" onClick={() => { setEditPropertyId(property.id); setModalOpen(true); }}>
                    <Edit className="size-3.5" />تعديل
                  </Button>
                  <Button variant="danger" className="min-h-11 px-2 text-xs" onClick={() => handleArchiveProperty(property.id, property.title ?? 'عقار')} disabled={deleteMutation.isPending}>
                    <Trash2 className="size-3.5" />أرشفة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length > 0 && viewMode === 'table' ? (
          <DataTable aria-label="جدول العقارات">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العقار</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden sm:table-cell">العنوان</TableHead>
                  <TableHead className="hidden lg:table-cell">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell><p className="font-bold">{property.title ?? '—'}</p></TableCell>
                    <TableCell>
                      <StatusBadge tone={propertyStatusTone[property.status as keyof typeof propertyStatusTone] ?? 'gray'}>
                        {propertyStatusLabels[property.status as keyof typeof propertyStatusLabels] ?? property.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{property.address ?? '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-2">
                        <Button asChild variant="secondary" className="min-h-11 px-3 text-xs">
                          <Link to="/properties/$propertyId" params={{ propertyId: property.id }}><Eye className="size-3" />عرض</Link>
                        </Button>
                        <Button variant="secondary" className="min-h-11 px-3 text-xs" onClick={() => { setEditPropertyId(property.id); setModalOpen(true); }}>
                          <Edit className="size-3" />تعديل
                        </Button>
                        <Button variant="danger" className="min-h-11 px-3 text-xs" aria-label={`أرشفة ${property.title ?? 'العقار'}`} onClick={() => handleArchiveProperty(property.id, property.title ?? 'عقار')} disabled={deleteMutation.isPending}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
        ) : null}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>السابق</Button>
            <span className="text-sm font-bold text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>التالي</Button>
          </div>
        ) : null}
      </div>
      <PropertyFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditPropertyId(undefined); }}
        propertyId={editPropertyId}
      />
    </>
  );
}
