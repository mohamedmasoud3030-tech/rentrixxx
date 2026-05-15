import { Select } from '@/components/ui/select';

type OwnerPropertySelectProps = Readonly<{
  value: string;
  disabled: boolean;
  properties: Array<{ id: string; title: string }>;
  onValueChange: (propertyId: string) => void;
}>;

export function OwnerPropertySelect({ value, disabled, properties, onValueChange }: OwnerPropertySelectProps) {
  return (
    <Select value={value} onChange={(event) => onValueChange(event.currentTarget.value)} disabled={disabled}>
      <option value="">اختر العقار</option>
      {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
    </Select>
  );
}
