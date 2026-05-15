import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { arrearsBucketOptions, type ArrearsBucketFilter } from './arrears-workflow-helpers';

type ArrearsFiltersProps = {
  asOf: string;
  search: string;
  bucketFilter: ArrearsBucketFilter;
  onAsOfChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onBucketFilterChange: (value: ArrearsBucketFilter) => void;
};

export function ArrearsFilters({
  asOf,
  search,
  bucketFilter,
  onAsOfChange,
  onSearchChange,
  onBucketFilterChange,
}: ArrearsFiltersProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(180px,0.7fr)_minmax(220px,1.4fr)_minmax(180px,0.8fr)]">
      <label className="space-y-2 text-sm font-bold">
        <span>حتى تاريخ</span>
        <Input type="date" value={asOf} onChange={(event) => onAsOfChange(event.target.value)} />
      </label>
      <label className="space-y-2 text-sm font-bold">
        <span>بحث التحصيل</span>
        <Input
          value={search}
          placeholder="ابحث برقم الفاتورة، المستأجر، العقار، الوحدة، أو العقد"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label className="space-y-2 text-sm font-bold">
        <span>فئة العمر</span>
        <Select value={bucketFilter} onChange={(event) => onBucketFilterChange(event.target.value as ArrearsBucketFilter)}>
          {arrearsBucketOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </label>
    </div>
  );
}
