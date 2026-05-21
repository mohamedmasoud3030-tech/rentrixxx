import type { Property, Unit } from '@/types/domain';
import { formatDefaultCompanyMoney } from '@lib/format';
import { unitStatusLabels } from '@/features/units/unit-schema';

export type ContractUnitOptionUnit = Pick<Unit, 'id' | 'unit_number' | 'status' | 'rent_amount'>;
export type ContractUnitOptionProperty = Pick<Property, 'title' | 'address'> | null | undefined;

type ContractUnitOptionLabelParams = Readonly<{
  unit: ContractUnitOptionUnit;
  property?: ContractUnitOptionProperty;
  formatRent?: (amount: number | null | undefined) => string;
}>;

type ContractUnitSelectableParams = Readonly<{
  unit: ContractUnitOptionUnit;
  selectedUnitId?: string | null;
}>;

export function buildContractUnitOptionLabel({ unit, property, formatRent = formatDefaultCompanyMoney }: ContractUnitOptionLabelParams): string {
  const propertyLabel = property ? `${property.title} — ${property.address}` : null;
  const rentLabel = unit.rent_amount === null ? 'الإيجار غير محدد' : `الإيجار ${formatRent(unit.rent_amount)}`;
  const parts = [propertyLabel, `الوحدة ${unit.unit_number}`, `الحالة ${unitStatusLabels[unit.status]}`, rentLabel];

  return parts.filter((part): part is string => Boolean(part)).join(' | ');
}

export function isUnitSelectableForContract({ unit, selectedUnitId }: ContractUnitSelectableParams): boolean {
  return unit.status === 'available' || unit.id === selectedUnitId;
}
