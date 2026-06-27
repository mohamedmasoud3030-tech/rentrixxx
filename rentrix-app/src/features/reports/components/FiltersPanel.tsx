import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { CostCenterRecord } from '@/features/settings/costCenterService';
import type { FilterState } from '../reports-page.helpers';

export function FiltersPanel({ filters, costCenterRows, onChange, onResetCurrentMonth }: Readonly<{
  filters: FilterState;
  costCenterRows: CostCenterRecord[];
  onChange: (filters: FilterState) => void;
  onResetCurrentMonth: () => void;
}>) {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">فلترة الفترة</p>
            <CardDescription>حدد من/إلى لاحتساب الفترة، وتاريخ "الاحتساب" لحساب المتأخرات وأعمار الذمم.</CardDescription>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="space-y-1 text-sm font-bold">
            <span>من تاريخ</span>
            <Input type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>إلى تاريخ</span>
            <Input type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>تاريخ الاحتساب (As of)</span>
            <Input type="date" value={filters.asOf} onChange={(event) => onChange({ ...filters, asOf: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>مركز التكلفة</span>
            <Select value={filters.costCenterId} onChange={(event) => onChange({ ...filters, costCenterId: event.target.value })}>
              <option value="">كل مراكز التكلفة</option>
              {costCenterRows.filter((costCenter) => costCenter.is_active !== false).map((costCenter) => (
                <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={onResetCurrentMonth} variant="secondary"><RefreshCcw className="me-2 size-4" />الشهر الحالي</Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
