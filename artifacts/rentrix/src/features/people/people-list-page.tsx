import { Edit, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PersonFormModal } from './person-form-modal';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PersonCard } from '@/components/ui/person-card';
import { PageHero } from '@/components/ui/page-hero';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { personTypeLabels, personTypeValues } from './person-schema';
import type { PersonTypeFilter } from './people-service';
import { usePeople, useSoftDeletePerson } from './use-people';

const pageSize = 10;

export function PeopleListPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PersonTypeFilter>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | undefined>();
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const params = useMemo(() => ({ search, type, page, pageSize }), [page, search, type]);
  const peopleQuery = usePeople(params);
  const deleteMutation = useSoftDeletePerson();
  const totalPages = Math.max(1, Math.ceil((peopleQuery.data?.count ?? 0) / pageSize));
  const rows = peopleQuery.data?.rows ?? [];
  const hasFilters = search.trim().length > 0 || type !== 'all';

  const handleArchivePerson = async (personId: string) => {
    setArchiveError(null);
    try {
      await deleteMutation.mutateAsync(personId);
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'تعذر أرشفة الشخص. تحقق من الصلاحيات وحاول مرة أخرى.');
    }
  };

  return (
    <>
    <div className="space-y-5 pb-24 sm:pb-6" dir="rtl">
      <PageHero
        eyebrow="الأطراف والعلاقات"
        title="الأشخاص"
        description="دليل موحد للمستأجرين والملاك وجهات الاتصال بنفس لغة لوحة التحكم التشغيلية."
        icon={Users}
        primaryMetric={peopleQuery.data?.count ?? rows.length}
        primaryLabel="إجمالي الأشخاص"
        secondaryMetric={rows.length}
        secondaryLabel="سجلات معروضة"
        isLoading={peopleQuery.isLoading}
        accent="primary"
        pills={[
          { label: hasFilters ? 'بحث أو تصفية مفعّلة' : 'كل الأنواع', tone: hasFilters ? 'amber' : 'slate', icon: Users },
          { label: `صفحة ${page} من ${totalPages}`, tone: 'sky' },
        ]}
        action={(
          <Button className="bg-white text-slate-900 hover:bg-white/90" onClick={() => { setEditPersonId(undefined); setModalOpen(true); }}>
            <Plus className="me-2 size-4" />إضافة شخص
          </Button>
        )}
      />

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_14rem]">
          <Input aria-label="بحث الأشخاص" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="بحث بالاسم أو الهاتف أو الهوية" />
          <Select aria-label="تصفية الأشخاص حسب النوع" value={type} onChange={(event) => { setType(event.target.value as PersonTypeFilter); setPage(1); }}>
            <option value="all">كل الأنواع</option>
            {personTypeValues.map((item) => <option key={item} value={item}>{personTypeLabels[item]}</option>)}
          </Select>
        </CardContent>
      </Card>

      {archiveError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive" role="alert">{archiveError}</div> : null}

      {peopleQuery.isLoading ? (
        <Card className="overflow-hidden">
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        </Card>
      ) : peopleQuery.isError ? (
        <Card className="overflow-hidden">
          <div className="p-6">
            <EmptyState
              title="تعذر تحميل الأشخاص"
              description="حدث خطأ أثناء تحميل البيانات. يمكنك إعادة المحاولة بدون تغيير البيانات."
              role="alert"
              ariaLive="assertive"
              action={<Button onClick={() => { peopleQuery.refetch(); }}>إعادة المحاولة</Button>}
            />
          </div>
        </Card>
      ) : rows.length ? (
        <>
          {/* Mobile card view */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {rows.map((person) => (
              <div key={person.id} className="space-y-1.5">
                <PersonCard
                  id={person.id}
                  fullName={person.full_name}
                  type={person.type}
                  phone={person.phone}
                  email={person.email}
                  nationalId={person.national_id}
                  address={person.address}
                  onClick={() => { setEditPersonId(person.id); setModalOpen(true); }}
                />
                <div className="flex items-center justify-end gap-2 px-1">
                <Button variant="secondary" className="min-h-11 rounded-xl px-3 text-xs gap-1.5" onClick={() => { setEditPersonId(person.id); setModalOpen(true); }}>
                  <Edit className="size-3.5" />تعديل
                </Button>
                  <Button
                    variant="danger"
                    className="min-h-11 rounded-xl px-3 text-xs gap-1.5"
                    aria-label={`أرشفة ${person.full_name}`}
                    onClick={() => { void handleArchivePerson(person.id); }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />أرشفة
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>البريد</TableHead>
                    <TableHead>رقم الهوية</TableHead>
                    <TableHead className="w-40">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <div className="font-black">{person.full_name}</div>
                        <div className="text-xs text-muted-foreground">{person.address ?? '—'}</div>
                      </TableCell>
                      <TableCell>{personTypeLabels[person.type]}</TableCell>
                      <TableCell>{person.phone ?? '—'}</TableCell>
                      <TableCell dir="ltr" className="text-right">{person.email ?? '—'}</TableCell>
                      <TableCell>{person.national_id ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="min-h-11 px-3" onClick={() => { setEditPersonId(person.id); setModalOpen(true); }}><Edit className="size-4" /></Button>
                          <Button variant="danger" className="min-h-11 px-3" aria-label={`أرشفة ${person.full_name}`} onClick={() => { void handleArchivePerson(person.id); }} disabled={deleteMutation.isPending}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-6"><EmptyState title="لا توجد سجلات أشخاص" description="أضف مستأجراً أو مالكاً أو جهة اتصال." action={<Button onClick={() => { setEditPersonId(undefined); setModalOpen(true); }}>إضافة شخص</Button>} /></div>
        </Card>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الصفحة {page} من {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</Button>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>التالي</Button>
        </div>
      </div>
    </div>
    <PersonFormModal
      open={modalOpen}
      onClose={() => { setModalOpen(false); setEditPersonId(undefined); }}
      personId={editPersonId}
    />
    </>
  );
}
