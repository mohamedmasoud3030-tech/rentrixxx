import { Link } from '@tanstack/react-router';
import { Download, Edit, Eye, Plus, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { documentEngine } from '@/services/documents/documentEngine';
import { formatCompanyMoney } from '@lib/format';
import { propertyStatusLabels, propertyStatusValues } from './property-schema';
import { useProperties, useSoftDeleteProperty } from './use-properties';
import { listPropertiesForExport, type PropertyStatusFilter } from './property-service';

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
  const params = useMemo(() => ({ search, status, page, pageSize }), [page, search, status]);
  const propertiesQuery = useProperties(params);
  const deleteMutation = useSoftDeleteProperty();
  const totalPages = Math.max(1, Math.ceil((propertiesQuery.data?.count ?? 0) / pageSize));
  const hasFilterValues = search.trim().length > 0 || status !== 'all';

  const handleArchiveProperty = async (propertyId: string, title: string) => {
    const shouldArchive = globalThis.confirm(`سيتم أرشفة العقار "${title}" وإخفاؤه من القوائم النشطة. يمكنك مراجعته لاحقًا من السجلات المؤرشفة. هل تريد المتابعة؟`);
    if (!shouldArchive) {
      return;
    }
    await deleteMutation.mutateAsync(propertyId);
  };

  const exportProperties = async () => {
    try {
      const rows = await listPropertiesForExport(search, status);
      documentEngine.exportCsv('properties-report', {
        fileName: 'properties-export',
        rows: rows.map((property) => ({
          propertyTitle: property.title,
          type: property.type,
          owner: property.owner_name ?? '',
          status: propertyStatusLabels[property.status],
          address: property.address ?? '',
          amount: property.current_value ?? '',
        })),
        headers: ['propertyTitle', 'type', 'owner', 'status', 'address', 'amount'],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصدير بيانات العقارات');
    }
  };

  function renderPropertiesContent() {
    if (propertiesQuery.isLoading) {
      return (
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}
        </div>
      );
    }

    if (propertiesQuery.isError) {
      return (
        <div className="p-6">
          <EmptyState
            title="تعذر تحميل قائمة العقارات"
            description={propertiesQuery.error instanceof Error ? propertiesQuery.error.message : 'حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.'}
            action={<Button variant="secondary" onClick={() => propertiesQuery.refetch()}>إعادة المحاولة</Button>}
          />
        </div>
      );
    }

    const rows = propertiesQuery.data?.rows ?? [];
    if (rows.length > 0) {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العقار</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المالك</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>القيمة الحالية</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <div className="font-black">{property.title}</div>
                    <div className="text-xs text-muted-foreground">{property.address}</div>
                  </TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell>{property.owner_name ?? '—'}</TableCell>
                  <TableCell><StatusBadge tone={propertyStatusTone[property.status]}>{propertyStatusLabels[property.status]}</StatusBadge></TableCell>
                  <TableCell dir="ltr" className="font-bold">{money(property.current_value)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/properties/$propertyId" params={{ propertyId: property.id }}><Eye className="size-4" /></Link></Button>
                      <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/properties/$propertyId/edit" params={{ propertyId: property.id }}><Edit className="size-4" /></Link></Button>
                      <Button variant="danger" className="min-h-9 px-3" onClick={() => { void handleArchiveProperty(property.id, property.title); }} disabled={deleteMutation.isPending}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return <div className="p-6"><EmptyState title="لا توجد عقارات" description={hasFilterValues ? 'غيّر البحث أو الفلتر لعرض نتائج أخرى.' : 'ابدأ بإضافة أول عقار في النظام.'} action={<Button asChild><Link to="/properties/new">إضافة عقار</Link></Button>} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">العقارات</h2>
          <p className="text-sm text-muted-foreground">إدارة العقارات والوحدات المرتبطة بها.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!propertiesQuery.data?.rows.length} onClick={() => { void exportProperties(); }}><Download className="ms-2 size-4" />تصدير</Button>
          <Button variant="secondary" disabled={!propertiesQuery.data?.rows.length} onClick={() => { const rows = propertiesQuery.data?.rows ?? []; const err = documentEngine.previewDocument('properties-report', rows); if (err.errorMessage) globalThis.alert(err.errorMessage); }}><Printer className="ms-2 size-4" />معاينة</Button>
          <Button asChild><Link to="/properties/new"><Plus className="ms-2 size-4" />إضافة عقار</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_14rem]">
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="بحث باسم العقار أو العنوان" />
          <Select value={status} onChange={(event) => { setStatus(event.target.value as PropertyStatusFilter); setPage(1); }}>
            <option value="all">كل الحالات</option>
            {propertyStatusValues.map((item) => <option key={item} value={item}>{propertyStatusLabels[item]}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {renderPropertiesContent()}
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الصفحة {page} من {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</Button>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>التالي</Button>
        </div>
      </div>
    </div>
  );
}
