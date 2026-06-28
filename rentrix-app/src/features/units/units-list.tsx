import { Archive, DoorOpen, Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { StatusBadge } from '@/components/ui/status-badge';
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
  const navigate = useNavigate();

  const openForCreate = () => { setEditingUnit(null); setModalOpen(true); };
  const openForEdit = (unit: Unit) => { setEditingUnit(unit); setModalOpen(true); };
  const confirmArchive = () => {
    if (!archiveCandidate) return;
    deleteMutation.mutate(archiveCandidate.id, { onSettled: () => setArchiveCandidate(null) });
  };

  const columns: ColumnDef<Unit>[] = [
    {
      key: 'unit_number',
      header: 'رقم الوحدة',
      render: (unit) => (
        <EntityCell icon={DoorOpen} title={`وحدة ${unit.unit_number}`} subtitle={unit.floor ? `الدور: ${unit.floor}` : null} />
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (unit) => (
        <StatusBadge tone={unitStatusTone[unit.status]}>{unitStatusLabels[unit.status]}</StatusBadge>
      ),
    },
    {
      key: 'rent_amount',
      header: 'الإيجار',
      render: (unit) => <span dir="ltr" className="block font-bold">{money(unit.rent_amount)}</span>,
    },
    {
      key: 'notes',
      header: 'ملاحظات',
      render: (unit) => unit.notes ?? '—',
    },
    {
      key: 'actions',
      header: 'إجراءات',
      render: (unit) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openForEdit(unit)}>
            <Edit className="size-4" />
          </Button>
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
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>الوحدات</CardTitle>
          <CardDescription>إدارة وحدات العقار الحالي فقط.</CardDescription>
        </div>
        {!unitsQuery.isError ? (
          <Button onClick={openForCreate}><Plus className="ml-2 size-4" />إضافة وحدة</Button>
        ) : null}
      </CardHeader>

      <div className="px-6 pb-6">
        <EntityTable
          aria-label="جدول وحدات العقار"
          rows={unitsQuery.data ?? []}
          columns={columns}
          keyOf={(u) => u.id}
          isLoading={unitsQuery.isLoading}
          error={unitsQuery.isError ? unitsQuery.error : null}
          errorTitle="تعذر تحميل وحدات العقار"
          onRetry={() => unitsQuery.refetch()}
          emptyTitle="لا توجد وحدات"
          emptyDescription="أضف الوحدات التابعة لهذا العقار من هنا."
          emptyAction={<Button onClick={openForCreate}>إضافة وحدة</Button>}
          onRowClick={(unit) => navigate({
            to: '/properties/$propertyId/units/$unitId',
            params: { propertyId, unitId: unit.id }
          })}
          renderMobileCard={(unit) => (
            <div className="space-y-1.5">
              <UnitCard
                id={unit.id}
                unitNumber={unit.unit_number}
                floor={unit.floor}
                status={unit.status}
                rentAmount={unit.rent_amount}
                notes={unit.notes}
                onClick={() => navigate({
                  to: '/properties/$propertyId/units/$unitId',
                  params: { propertyId, unitId: unit.id }
                })}
                formatMoney={(value) => formatCompanyMoney(defaultCompanyLocalSettings, value)}
              />
              <div className="flex gap-2 px-1">
                <Button variant="secondary" className="h-9 flex-1" onClick={() => openForEdit(unit)}>
                  <Edit className="me-1 size-3.5" />تعديل
                </Button>
                <Button
                  variant="danger"
                  className="h-9 flex-1"
                  aria-label="أرشفة الوحدة"
                  onClick={() => setArchiveCandidate(unit)}
                  disabled={deleteMutation.isPending}
                >
                  <Archive className="me-1 size-3.5" />أرشفة
                </Button>
              </div>
            </div>
          )}
        />
      </div>

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
