import { Link } from '@tanstack/react-router';
import { Download, Edit, Plus, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { canPrintOperationalReport, runOperationalPrint } from '@/lib/operationalPrint';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { documentEngine } from '@/services/documents/documentEngine';
import type { CsvRow } from '@/utils/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { personTypeLabels, personTypeValues } from './person-schema';
import { listPeopleByIds, listPeopleForExport, type PersonTypeFilter } from './people-service';
import { usePeople, useSoftDeletePerson } from './use-people';

const pageSize = 10;

function getPeopleTableState(isLoading: boolean, peopleCount: number): 'loading' | 'table' | 'empty' {
  if (isLoading) return 'loading';
  if (peopleCount > 0) return 'table';
  return 'empty';
}

function showAsyncError(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback);
}

export function PeopleListPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PersonTypeFilter>('all');
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ search, type, page, pageSize }), [page, search, type]);
  const peopleQuery = usePeople(params);
  const peopleRows = peopleQuery.data?.rows ?? [];
  const bulkSelection = useBulkSelection(peopleRows.map((person) => person.id));
  const deleteMutation = useSoftDeletePerson();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isExportPending, setIsExportPending] = useState(false);
  const totalPages = Math.max(1, Math.ceil((peopleQuery.data?.count ?? 0) / pageSize));

  const tableState = getPeopleTableState(peopleQuery.isLoading, peopleRows.length);

  const handleDeletePerson = async (personId: string, personName: string) => {
    const confirmed = globalThis.confirm(`هل أنت متأكد من أرشفة الشخص "${personName}"؟`);
    if (!confirmed) return;
    setPendingDeleteId(personId);
    try {
      await deleteMutation.mutateAsync(personId);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const exportPeople = async (mode: 'selected' | 'filtered') => {
    if (isExportPending) return;
    setIsExportPending(true);
    try {
      const targetRows = mode === 'selected'
        ? await listPeopleByIds([...bulkSelection.selectedIds])
        : await listPeopleForExport(search, type);
      if (mode === 'selected' && targetRows.length !== bulkSelection.selectedCount) {
        throw new Error('تعذر تصدير كل السجلات المحددة. ربما تم حذف بعض الأشخاص أو تغيّر الوصول إليها.');
      }
      const csvRows: CsvRow[] = targetRows.map((person) => ({
        fullName: person.full_name ?? '',
        type: personTypeLabels[person.type],
        phone: person.phone ?? '',
        email: person.email ?? '',
        nationalId: person.national_id ?? '',
        address: person.address ?? '',
      }));
      const result = documentEngine.exportCsv('owners-report', {
        fileName: 'people-export',
        rows: csvRows,
        headers: ['fullName', 'type', 'phone', 'email', 'nationalId', 'address'],
      });
      if (!result.success) throw new Error(result.errorMessage ?? 'تعذر تصدير بيانات الأشخاص');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصدير بيانات الأشخاص');
    } finally {
      setIsExportPending(false);
    }
  };

  function renderPeopleContent() {
    if (tableState === 'loading') {
      return (
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}
        </div>
      );
    }

    if (tableState === 'table') {
      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>رقم الهوية</TableHead>
                <TableHead className="w-14 text-center">
                  <input type="checkbox" checked={bulkSelection.allSelected} onChange={() => bulkSelection.toggleAll()} aria-label="تحديد كل الأشخاص" className="size-4 accent-primary" />
                </TableHead>
                <TableHead className="w-40">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peopleRows.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="font-black">{person.full_name}</div>
                    <div className="text-xs text-muted-foreground">{person.address ?? '—'}</div>
                  </TableCell>
                  <TableCell>{personTypeLabels[person.type]}</TableCell>
                  <TableCell>{person.phone ?? '—'}</TableCell>
                  <TableCell dir="ltr" className="text-right">{person.email ?? '—'}</TableCell>
                  <TableCell>{person.national_id ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    <input type="checkbox" checked={bulkSelection.isSelected(person.id)} onChange={() => bulkSelection.toggleOne(person.id)} aria-label={`تحديد ${person.full_name}`} className="size-4 accent-primary" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="min-h-9 px-3" asChild><Link to="/people/$personId/edit" params={{ personId: person.id }}><Edit className="size-4" /></Link></Button>
                      <Button
                        variant="danger"
                        className="min-h-9 px-3"
                        onClick={() => { handleDeletePerson(person.id, person.full_name).catch((error) => showAsyncError(error, 'تعذر أرشفة الشخص')); }}
                        disabled={deleteMutation.isPending || pendingDeleteId === person.id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (peopleQuery.isError) {
      return (
        <div className="p-6">
          <EmptyState
            title="تعذر تحميل سجلات الأشخاص"
            description={peopleQuery.error instanceof Error ? peopleQuery.error.message : 'حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى.'}
            action={<Button variant="secondary" onClick={() => { peopleQuery.refetch().catch((error) => showAsyncError(error, 'تعذر إعادة تحميل الأشخاص')); }}>إعادة المحاولة</Button>}
          />
        </div>
      );
    }

    return <div className="p-6"><EmptyState title="لا توجد سجلات أشخاص" description="أضف مستأجراً أو مالكاً أو جهة اتصال." action={<Button asChild><Link to="/people/new">إضافة شخص</Link></Button>} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">الأشخاص</h2>
          <p className="text-sm text-muted-foreground">جدول موحد للمستأجرين والملاك وجهات الاتصال.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!canPrintOperationalReport(peopleRows.length > 0, peopleQuery.isLoading, peopleQuery.isError)} onClick={() => { const err = runOperationalPrint(peopleRows.length > 0, peopleQuery.isLoading, peopleQuery.isError, { title: 'قائمة الأشخاص', generatedAt: new Date().toLocaleDateString('ar-OM'), tables: [{ title: 'الأشخاص', columns: ['الاسم', 'النوع', 'الهاتف'], rows: peopleRows.slice(0, 40).map((row) => [row.full_name, personTypeLabels[row.type], row.phone ?? '—']) }] }); if (err) globalThis.alert(err); }}><Printer className="ms-2 size-4" />طباعة قائمة الأشخاص</Button>
          <Button variant="secondary" onClick={() => { exportPeople('filtered').catch((error) => showAsyncError(error, 'تعذر تصدير بيانات الأشخاص')); }} disabled={(peopleQuery.data?.count ?? 0) === 0 || isExportPending}><Download className="ms-2 size-4" />تصدير النتائج</Button>
          <Button asChild><Link to="/people/new"><Plus className="ms-2 size-4" />إضافة شخص</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_14rem]">
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="بحث بالاسم أو الهاتف أو الهوية" />
          <Select value={type} onChange={(event) => { setType(event.target.value as PersonTypeFilter); setPage(1); }}>
            <option value="all">كل الأنواع</option>
            {personTypeValues.map((item) => <option key={item} value={item}>{personTypeLabels[item]}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {renderPeopleContent()}
      </Card>
      <BulkActionsBar
        selectedCount={bulkSelection.selectedCount}
        selectionLabel={`تم تحديد ${bulkSelection.selectedCount.toLocaleString('ar')} شخص`}
        onClear={bulkSelection.clear}
        actions={<Button variant="secondary" onClick={() => { exportPeople('selected').catch((error) => showAsyncError(error, 'تعذر تصدير السجلات المحددة')); }} disabled={isExportPending}><Download className="ms-2 size-4" />تصدير المحدد</Button>}
      />

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
