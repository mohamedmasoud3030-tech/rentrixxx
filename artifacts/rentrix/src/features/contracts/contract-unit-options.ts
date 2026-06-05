import type { Property, Unit } from '@/types/domain';
import { formatDefaultCompanyMoney } from '@/lib/companyFormatters';
import { unitStatusLabels } from '@/features/units/unit-schema';

export type ContractUnitOptionUnit = Pick<Unit, 'id' | 'property_id' | 'unit_number' | 'status' | 'rent_amount'>;
export type ContractUnitOptionProperty = Pick<Property, 'title' | 'address'> | null | undefined;

type ContractUnitOptionLabelParams = Readonly<{
  unit: ContractUnitOptionUnit;
  property?: ContractUnitOptionProperty;
  formatRent?: (amount: number | null | undefined) => string;
}>;

type ContractUnitSelectableParams = Readonly<{
  unit: ContractUnitOptionUnit;
  currentLinkedUnitId?: string | null;
}>;

type ContractUnitSelectionParams = Readonly<{
  units: readonly ContractUnitOptionUnit[];
  propertyId: string;
  unitId: string;
  currentLinkedUnitId?: string | null;
}>;

export function buildContractUnitOptionLabel({ unit, property, formatRent = formatDefaultCompanyMoney }: ContractUnitOptionLabelParams): string {
  const propertyLabel = property ? `${property.title} — ${property.address}` : null;
  const rentLabel = unit.rent_amount === null ? 'الإيجار غير محدد' : `الإيجار ${formatRent(unit.rent_amount)}`;
  const parts = [propertyLabel, `الوحدة ${unit.unit_number}`, `الحالة ${unitStatusLabels[unit.status]}`, rentLabel];

  return parts.filter((part): part is string => Boolean(part)).join(' | ');
}

export function isUnitSelectableForContract({ unit, currentLinkedUnitId }: ContractUnitSelectableParams): boolean {
  return unit.status === 'available' || unit.id === currentLinkedUnitId;
}

export function getContractUnitSelectionIssue({ units, propertyId, unitId, currentLinkedUnitId }: ContractUnitSelectionParams): string | null {
  const unit = units.find((candidate) => candidate.id === unitId);
  if (!unit) return 'اختر وحدة من قائمة العقار المحدد';
  if (unit.property_id !== propertyId) return 'الوحدة المختارة لا تتبع العقار المحدد';
  if (!isUnitSelectableForContract({ unit, currentLinkedUnitId })) return 'لا يمكن إنشاء عقد على وحدة غير متاحة';
  return null;
}
