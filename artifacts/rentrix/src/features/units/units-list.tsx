import { Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Unit } from '@/types/domain';
import { unitStatusLabels } from './unit-schema';
import { UnitFormModal } from './unit-form-modal';
import { useSoftDeleteUnit, useUnits } from './use-units';

function money(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value);
}

export function UnitsList({ propertyId }: { propertyId: string }) {
  const unitsQuery = useUnits(propertyId);
  const deleteMutation = useSoftDeleteUnit(propertyId);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openForCreate = () => {
    setEditingUnit(null);
    setModalOpen(true);
  };

  const openForEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setModalOpen(true);
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
      <CardContent>
        {unitsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14" />)}
          </div>
        ) : unitsQuery.data?.length ? (
          <div className="overflow-x-auto rounded-2xl border border-border">
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
                    <TableCell>{unitStatusLabels[unit.status]}</TableCell>
                    <TableCell>{money(unit.rent_amount)}</TableCell>
                    <TableCell>{unit.notes ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="min-h-9 px-3" onClick={() => openForEdit(unit)}><Edit className="size-4" /></Button>
                        <Button variant="danger" className="min-h-9 px-3" onClick={() => void deleteMutation.mutate(unit.id)} disabled={deleteMutation.isPending}><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="لا توجد وحدات" description="أضف الوحدات التابعة لهذا العقار من هنا." action={<Button onClick={openForCreate}>إضافة وحدة</Button>} />
        )}
      </CardContent>
      <UnitFormModal propertyId={propertyId} unit={editingUnit} open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
