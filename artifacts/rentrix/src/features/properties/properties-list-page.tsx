import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, Edit, Eye, Grid3x3, List, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PropertyFormModal } from './property-form-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PropertyCard } from '@/components/ui/property-card';
import { PageHero } from '@/components/ui/page-hero';
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
  const activeCount = properties.filter((property) => property.status === 'active').length;

  return (
    <>
    <div className="space-y-5 pb-24 sm:pb-6" dir="rtl">
      <PageHero
        eyebrow="المحفظة"
        title="العقارات"
        description="إدارة العقارات والوحدات المرتبطة من مساحة واحدة متسقة مع لوحة التحكم."
        icon={Building2}
        primaryMetric={propertiesQuery.data?.count ?? properties.length}
        primaryLabel="إجمالي العقارات"
        secondaryMetric={activeCount}
        secondaryLabel="عقارات نشطة في الصفحة"
        isLoading={propertiesQuery.isLoading}
        accent="sky"
        pills={[
          { label: hasFilterValues ? 'فلاتر مفعّلة' : 'كل السجلات', tone: hasFilterValues ? 'amber' : 'slate', icon: List },
          { label: `${properties.length} معروضة`, tone: 'sky', icon: Grid3x3 },
        ]}
        action={(
          <Button className="rounded-2xl bg-white text-slate-900 hover:bg-white/90" onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
            <Plus className="me-2 size-4" />إضافة عقار
          </Button>
        )}
      />

      {/* Filters + View Toggle */}
      <Card className="rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
            <Input
              aria-label="بحث العقارات"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالاسم أو العنوان..."
              className="rounded-xl"
            />
            <Select
              aria-label="الحالة"
              value={status}
              onChange={(e) => { setStatus(e.target.value as PropertyStatusFilter); setPage(1); }}
              className="rounded-xl"
            >
              <option value="all">كل الحالات</option>
              {propertyStatusValues.map((s) => <option key={s} value={s}>{propertyStatusLabels[s]}</option>)}
            </Select>
            {/* View mode toggle — hidden on small screens (always cards) */}
            <div className="hidden md:flex items-center gap-1 rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-lg p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid3x3 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {propertiesQuery.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      )}

      {/* Error */}
      {!propertiesQuery.isLoading && propertiesQuery.isError && (
        <EmptyState
          title="تعذر تحميل قائمة العقارات"
          description="حدث خطأ أثناء تحميل البيانات."
          role="alert"
          ariaLive="assertive"
          action={<Button onClick={() => propertiesQuery.refetch()} className="rounded-2xl">إعادة المحاولة</Button>}
        />
      )}

      {/* Empty */}
      {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground/30 mb-3" />
          <p className="font-bold text-muted-foreground">
            {hasFilterValues ? 'لا توجد نتائج مطابقة للبحث' : 'لم تُضف عقارات بعد'}
          </p>
          {!hasFilterValues && (
            <Button className="mt-4 rounded-2xl" onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
              إضافة أول عقار
            </Button>
          )}
        </div>
      )}

      {/* Cards view (mobile default + optional on desktop) */}
      {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length > 0 && (viewMode === 'cards') && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <div key={p.id} className="relative group">
              <PropertyCard
                id={p.id}
                title={p.title ?? 'عقار'}
                address={p.address}
                status={p.status}
                formatMoney={(v) => money(v)}
                onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: p.id } })}
              />
              {/* Actions overlay */}
              <div className="absolute top-3 left-3 hidden gap-1.5 md:group-hover:flex">
                <Link to="/properties/$propertyId" params={{ propertyId: p.id }}>
                  <button type="button" className="grid size-7 place-items-center rounded-xl bg-background/90 shadow-sm border border-border text-muted-foreground hover:text-foreground transition-colors">
                    <Eye className="size-3.5" />
                  </button>
                </Link>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-xl bg-background/90 shadow-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setEditPropertyId(p.id); setModalOpen(true); }}
                >
                  <Edit className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-xl bg-background/90 shadow-sm border border-border text-muted-foreground hover:text-rose-600 transition-colors"
                  onClick={() => handleArchiveProperty(p.id, p.title ?? 'عقار')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 md:hidden">
                <Button asChild variant="secondary" className="min-h-11 rounded-xl px-2 text-xs">
                  <Link to="/properties/$propertyId" params={{ propertyId: p.id }}><Eye className="size-3.5" />عرض</Link>
                </Button>
                <Button variant="secondary" className="min-h-11 rounded-xl px-2 text-xs" onClick={() => { setEditPropertyId(p.id); setModalOpen(true); }}>
                  <Edit className="size-3.5" />تعديل
                </Button>
                <Button variant="danger" className="min-h-11 rounded-xl px-2 text-xs" onClick={() => handleArchiveProperty(p.id, p.title ?? 'عقار')}>
                  <Trash2 className="size-3.5" />أرشفة
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table view (desktop optional) */}
      {!propertiesQuery.isLoading && !propertiesQuery.isError && properties.length > 0 && viewMode === 'table' && (
        <Card className="overflow-hidden rounded-2xl">
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
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-bold">{p.title ?? '—'}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={propertyStatusTone[p.status as keyof typeof propertyStatusTone] ?? 'gray'}>
                      {propertyStatusLabels[p.status as keyof typeof propertyStatusLabels] ?? p.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{p.address ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-2">
                      <Button asChild variant="secondary" className="min-h-11 rounded-xl px-3 text-xs gap-1">
                        <Link to="/properties/$propertyId" params={{ propertyId: p.id }}><Eye className="size-3" />عرض</Link>
                      </Button>
                      <Button variant="secondary" className="min-h-11 rounded-xl px-3 text-xs gap-1" onClick={() => { setEditPropertyId(p.id); setModalOpen(true); }}>
                        <Edit className="size-3" />تعديل
                      </Button>
                      <button
                        type="button"
                        className="min-h-11 rounded-xl px-2 text-xs border border-border text-muted-foreground hover:text-rose-600 hover:border-rose-300 transition-colors"
                        onClick={() => handleArchiveProperty(p.id, p.title ?? 'عقار')}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            className="rounded-xl"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          <span className="text-sm font-bold text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="secondary"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
    <PropertyFormModal
      open={modalOpen}
      onClose={() => { setModalOpen(false); setEditPropertyId(undefined); }}
      propertyId={editPropertyId}
    />
    </>
  );
}
