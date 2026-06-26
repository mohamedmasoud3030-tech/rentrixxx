import { Edit, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PersonFormModal } from './person-form-modal';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityCell } from '@/components/ui/entity-cell';
import { PersonCard, personTypeMap } from '@/components/ui/person-card';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = useMemo(() => ({ search, type, page, pageSize }), [page, search, type]);
  const peopleQuery = usePeople(params);
  const deleteMutation = useSoftDeletePerson();
  const totalPages = Math.max(1, Math.ceil((peopleQuery.data?.count ?? 0) / pageSize));

  const openEdit = (id: string) => { setEditPersonId(id); setModalOpen(true); };
  const openCreate = () => { setEditPersonId(undefined); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditPersonId(undefined); };
  const confirmDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">الأشخاص</h2>
            <p className="text-sm text-muted-foreground">جدول موحد للمستأجرين والملاك وجهات الاتصال.</p>
          </div>
          <Button onClick={openCreate}><Plus className="ml-2 size-4" />إضافة شخص</Button>
        </div>

        <Card>
          <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_14rem]">
            <SearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="بحث بالاسم أو الهاتف أو الهوية"
            />
            <Select
              aria-label="تصفية الأشخاص حسب النوع"
              value={type}
              onChange={(event) => { setType(event.target.value as PersonTypeFilter); setPage(1); }}
            >
              <option value="all">كل الأنواع</option>
              {personTypeValues.map((item) => <option key={item} value={item}>{personTypeLabels[item]}</option>)}
            </Select>
          </CardContent>
        </Card>

        {peopleQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}
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
                action={<Button onClick={() => peopleQuery.refetch()}>إعادة المحاولة</Button>}
              />
            </div>
          </Card>
        ) : peopleQuery.data?.rows.length ? (
          <>
            {/* Mobile card view */}
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {peopleQuery.data.rows.map((person) => (
                <div key={person.id} className="space-y-1.5">
                  <PersonCard
                    id={person.id}
                    fullName={person.full_name}
                    type={person.type}
                    phone={person.phone}
                    email={person.email}
                    nationalId={person.national_id}
                    address={person.address}
                    onClick={() => openEdit(person.id)}
                  />
                  <div className="flex items-center justify-end gap-2 px-1">
                    <Button variant="secondary" className="min-h-11 rounded-xl px-3 text-xs gap-1.5" onClick={() => openEdit(person.id)}>
                      <Edit className="size-3.5" />تعديل
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-11 rounded-xl px-3 text-xs gap-1.5"
                      aria-label={`أرشفة ${person.full_name}`}
                      onClick={() => setDeleteId(person.id)}
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
                    {peopleQuery.data.rows.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <EntityCell
                            icon={personTypeMap[person.type]?.icon ?? personTypeMap['contact']!.icon}
                            tone={person.type === 'owner' ? 'emerald' : person.type === 'contact' ? 'slate' : 'primary'}
                            title={person.full_name}
                            subtitle={person.address}
                          />
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold', (personTypeMap[person.type] ?? personTypeMap['contact']!).bg, (personTypeMap[person.type] ?? personTypeMap['contact']!).text)}>
                            {personTypeLabels[person.type]}
                          </span>
                        </TableCell>
                        <TableCell>{person.phone ?? '—'}</TableCell>
                        <TableCell dir="ltr" className="text-right">{person.email ?? '—'}</TableCell>
                        <TableCell>{person.national_id ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="secondary" className="min-h-11 px-3" onClick={() => openEdit(person.id)}><Edit className="size-4" /></Button>
                            <Button variant="danger" className="min-h-11 px-3" aria-label={`أرشفة ${person.full_name}`} onClick={() => setDeleteId(person.id)}><Trash2 className="size-4" /></Button>
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
            <div className="p-6">
              <EmptyState title="لا توجد سجلات أشخاص" description="أضف مستأجراً أو مالكاً أو جهة اتصال." action={<Button onClick={openCreate}>إضافة شخص</Button>} />
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>الصفحة {page} من {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>السابق</Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>التالي</Button>
          </div>
        </div>
      </div>

      <PersonFormModal open={modalOpen} onClose={closeModal} personId={editPersonId} />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="أرشفة الشخص؟"
        description="سيتم أرشفة هذا الشخص ولن يظهر في القوائم الرئيسية."
        confirmLabel="أرشفة"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
