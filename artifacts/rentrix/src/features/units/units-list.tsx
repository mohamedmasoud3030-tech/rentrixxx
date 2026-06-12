import { Archive, Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UnitCard } from '@/components/ui/unit-card';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import type { Unit } from '@/types/domain';
import { unitStatusLabels } from './unit-schema';
import { UnitFormModal } from './unit-form-modal';
import { useSoftDeleteUnit } from './use-units';

const unitStatusTone = { available: 'green', occupied: 'blue', maintenance: 'gold', reserved: 'gray' } as const;

function money(value: number | null) {
  if (value === null) return '—';
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

export function UnitsList({ propertyId, unitsQuery }: Readonly<{ propertyId: string; unitsQuery: UseQueryResult<Unit[]> }>) {
  const deleteMutation = useSoftDeleteUnit(propertyId);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openForCreate = () => {
    setEditingUnit(null);
    setArchiveCandidate(null);
    setModalOpen(true);
  };

  const openForEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setArchiveCandidate(null);
    setModalOpen(true);
  };

  const requestArchiveUnit = (unit: Unit) => {
    setArchiveCandidate(unit);
  };

  const confirmArchiveUnit = () => {
    if (!archiveCandidate) return;
    deleteMutation.mutate(archiveCandidate.id, {
      onSuccess: () => setArchiveCandidate(null),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>الوحدات</CardTitle>
          <CardDescription>إدارة وحدات العقار الحالي فقط.</CardDescription>
        </div>
        <Button onClick={openForCreate}><Plus className="ml-2 size-4" />إضافة وحدة</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {archiveCandidate ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-black">تأكيد أرشفة الوحدة {archiveCandidate.unit_number}</p>
            <p className="mt-1 text-sm text-muted-foreground">ستبقى بيانات الوحدة محفوظة كسجل أرشيفي ولن تظهر ضمن الوحدات النشطة.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="danger" onClick={confirmArchiveUnit} disabled={deleteMutation.isPending}>تأكيد الأرشفة</Button>
              <Button variant="secondary" onClick={() => setArchiveCandidate(null)} disabled={deleteMutation.isPending}>إلغاء</Button>
            </div>
          </div>
        ) : null}

        {unitsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        ) : unitsQuery.data?.length ? (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {unitsQuery.data.map((unit) => (
                <div key={unit.id} className="space-y-1.5">
                  <UnitCard
                    id={unit.id}
                    unitNumber={unit.unit_number}
                    floor={unit.floor}
                    status={unit.status}
                    rentAmount={unit.rent_amount}
                    notes={unit.notes}
                    onClick={() => openForEdit(unit)}
                    formatMoney={(value) => formatCompanyMoney(defaultCompanyLocalSettings, value)}
                  />
                  <Button
                    variant="danger"
                    className="w-full h-9 rounded-xl text-xs gap-1.5"
                    aria-label="أرشفة الوحدة"
                    onClick={() => requestArchiveUnit(unit)}
                    disabled={deleteMutation.isPending}
                  >
                    <Archive className="size-3.5" />أرشفة
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الوحدة</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإيجار</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitsQuery.data.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-black">{unit.unit_number}</TableCell>
                      <TableCell>{unit.floor ?? '—'}</TableCell>
                      <TableCell><StatusBadge tone={unitStatusTone[unit.status]}>{unitStatusLabels[unit.status]}</StatusBadge></TableCell>
                      <TableCell dir="ltr" className="font-bold">{money(unit.rent_amount)}</TableCell>
                      <TableCell>{unit.notes ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openForEdit(unit)}><Edit className="size-4" /></Button>
                          <Button variant="danger" className="min-h-9 px-3" aria-label="أرشفة الوحدة" onClick={() => requestArchiveUnit(unit)} disabled={deleteMutation.isPending}><Archive className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState title="لا توجد وحدات" description="أضف الوحدات التابعة لهذا العقار من هنا." action={<Button onClick={openForCreate}>إضافة وحدة</Button>} />
        )}
      </CardContent>
      <UnitFormModal propertyId={propertyId} unit={editingUnit} open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
