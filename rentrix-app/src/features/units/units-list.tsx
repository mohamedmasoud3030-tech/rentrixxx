import { Archive, DoorOpen, Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AsyncContentState } from '@/components/async-content-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityCell } from '@/components/ui/entity-cell';
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

  const openForCreate = () => { setEditingUnit(null); setModalOpen(true); };
  const openForEdit = (unit: Unit) => { setEditingUnit(unit); setModalOpen(true); };
  const confirmArchive = () => {
    if (!archiveCandidate) return;
    deleteMutation.mutate(archiveCandidate.id, { onSettled: () => setArchiveCandidate(null) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>الوحدات</CardTitle>
          <CardDescription>إدارة وحدات العقار الحالي فقط.</CardDescription>
        </div>
        {!unitsQuery.isError ? <Button onClick={openForCreate}><Plus className="ml-2 size-4" />إضافة وحدة</Button> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <AsyncContentState
          status={unitsQuery.isLoading ? 'loading' : unitsQuery.isError ? 'error' : !unitsQuery.data?.length ? 'empty' : 'ready'}
          error={unitsQuery.error}
          errorTitle="تعذر تحميل وحدات العقار"
          errorAction={<Button onClick={() => unitsQuery.refetch()}>إعادة المحاولة</Button>}
          emptyTitle="لا توجد وحدات"
          emptyDescription="أضف الوحدات التابعة لهذا العقار من هنا."
          emptyAction={<Button onClick={openForCreate}>إضافة وحدة</Button>}
        >
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {(unitsQuery.data ?? []).map((unit) => (
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
                  <div className="flex gap-2 px-1">
                    <Button variant="secondary" size="sm" className="h-9 flex-1" onClick={() => openForEdit(unit)}>
                      <Edit className="me-1 size-3.5" />تعديل
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-9 flex-1"
                      aria-label="أرشفة الوحدة"
                      onClick={() => setArchiveCandidate(unit)}
                      disabled={deleteMutation.isPending}
                    >
                      <Archive className="me-1 size-3.5" />أرشفة
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الوحدة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإيجار</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(unitsQuery.data ?? []).map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <EntityCell icon={DoorOpen} title={`وحدة ${unit.unit_number}`} subtitle={unit.floor ? `الدور: ${unit.floor}` : null} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={unitStatusTone[unit.status]}>{unitStatusLabels[unit.status]}</StatusBadge>
                      </TableCell>
                      <TableCell dir="ltr" className="font-bold">{money(unit.rent_amount)}</TableCell>
                      <TableCell>{unit.notes ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openForEdit(unit)}><Edit className="size-4" /></Button>
                          <Button
                            variant="danger"
                            className="min-h-9 px-3"
                            aria-label="أرشفة الوحدة"
                            onClick={() => setArchiveCandidate(unit)}
                            disabled={deleteMutation.isPending}
                          >
                            <Archive className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        </AsyncContentState>
      </CardContent>

      <UnitFormModal propertyId={propertyId} unit={editingUnit} open={modalOpen} onOpenChange={setModalOpen} />

      <ConfirmDialog
        open={Boolean(archiveCandidate)}
        onOpenChange={(open) => { if (!open) setArchiveCandidate(null); }}
        title={`أرشفة الوحدة ${archiveCandidate?.unit_number ?? ''}؟`}
        description="ستبقى بيانات الوحدة محفوظة كسجل أرشيفي ولن تظهر ضمن الوحدات النشطة."
        confirmLabel="تأكيد الأرشفة"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmArchive}
      />
    </Card>
  );
}
