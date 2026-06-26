import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, Edit, Eye, Grid3x3, List, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PropertyFormModal } from './property-form-modal';
import { AsyncContentState } from '@/components/async-content-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityCell } from '@/components/ui/entity-cell';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
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
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null);
  const params = useMemo(() => ({ search, status, page, pageSize }), [page, search, status]);
  const propertiesQuery = useProperties(params);
  const deleteMutation = useSoftDeleteProperty();
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil((propertiesQuery.data?.count ?? 0) / pageSize));
  const hasFilterValues = search.trim().length > 0 || status !== 'all';

  const handleArchiveProperty = async () => {
    if (!archiveTarget) return;
    await deleteMutation.mutateAsync(archiveTarget.id);
    setArchiveTarget(null);
  };

  const properties = propertiesQuery.data?.rows ?? [];

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">العقارات</h2>
          <p className="text-sm text-muted-foreground">إدارة العقارات والوحدات المرتبطة</p>
        </div>
        <Button className="rounded-2xl gap-2" onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
          <Plus className="size-4" />إضافة عقار
        </Button>
      </div>

      {/* Filters + View Toggle */}
      <Card className="rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2">
            <SearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="بحث بالاسم أو العنوان..."
              className="flex-1"
            />
            <Select
              aria-label="الحالة"
              value={status}
              onChange={(e) => { setStatus(e.target.value as PropertyStatusFilter); setPage(1); }}
              className="w-36 rounded-xl"
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

      <AsyncContentState
        status={
          propertiesQuery.isLoading ? 'loading'
          : propertiesQuery.isError ? 'error'
          : properties.length === 0 ? 'empty'
          : 'ready'
        }
        error={propertiesQuery.error}
        errorTitle="تعذر تحميل قائمة العقارات"
        errorAction={<Button onClick={() => propertiesQuery.refetch()} className="rounded-2xl">إعادة المحاولة</Button>}
        emptyTitle={hasFilterValues ? 'لا توجد نتائج مطابقة للبحث' : 'لم تُضف عقارات بعد'}
        emptyDescription={hasFilterValues ? 'جرّب تغيير عوامل البحث أو إزالة الفلتر.' : 'ابدأ بإضافة أول عقار لك.'}
        emptyAction={!hasFilterValues ? (
          <Button className="rounded-2xl" onClick={() => { setEditPropertyId(undefined); setModalOpen(true); }}>
            <Building2 className="me-2 size-4" />إضافة أول عقار
          </Button>
        ) : undefined}
      >

      {/* Cards view (mobile default + optional on desktop) */}
      {(viewMode === 'cards') && (
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
                  onClick={() => setArchiveTarget({ id: p.id, title: p.title ?? 'عقار' })}
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
                <Button variant="danger" className="min-h-11 rounded-xl px-2 text-xs" onClick={() => setArchiveTarget({ id: p.id, title: p.title ?? 'عقار' })}>
                  <Trash2 className="size-3.5" />أرشفة
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table view (desktop optional) */}
      {viewMode === 'table' && (
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
                    <EntityCell icon={Building2} title={p.title ?? '—'} />
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
                        onClick={() => setArchiveTarget({ id: p.id, title: p.title ?? 'عقار' })}
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

      </AsyncContentState>

      {/* Pagination */}
      {!propertiesQuery.isLoading && !propertiesQuery.isError && totalPages > 1 && (
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
    <ConfirmDialog
      open={Boolean(archiveTarget)}
      onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
      title={`أرشفة العقار "${archiveTarget?.title ?? ''}"؟`}
      description="سيتم إخفاء العقار من القوائم النشطة. يمكن التراجع عن هذا لاحقاً من سجل الأرشيف."
      confirmLabel="أرشفة"
      isLoading={deleteMutation.isPending}
      onConfirm={handleArchiveProperty}
    />
    </>
  );
}
