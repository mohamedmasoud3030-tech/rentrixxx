import { describe, expect, it } from 'vitest';
import { buildContractUnitOptionLabel, getContractUnitSelectionIssue, isUnitSelectableForContract, type ContractUnitOptionUnit } from './contract-unit-options';

describe('contract unit option helpers', () => {
  it('builds labels with property, address, unit number, visible status, and rent amount', () => {
    const unit: ContractUnitOptionUnit = {
      id: 'unit-1',
      property_id: 'property-1',
      unit_number: 'A-101',
      status: 'maintenance',
      rent_amount: 1250,
    };

    expect(
      buildContractUnitOptionLabel({
        unit,
        property: { title: 'برج النخيل', address: 'شارع 1' },
        formatRent: (amount) => `${amount ?? 0} OMR`,
      }),
    ).toBe('برج النخيل — شارع 1 | الوحدة A-101 | الحالة صيانة | الإيجار 1250 OMR');
  });

  it('keeps unavailable statuses visible and explains missing rent', () => {
    const unit: ContractUnitOptionUnit = {
      id: 'unit-2',
      property_id: 'property-1',
      unit_number: 'B-202',
      status: 'reserved',
      rent_amount: null,
    };

    expect(buildContractUnitOptionLabel({ unit })).toContain('الحالة محجوزة');
    expect(buildContractUnitOptionLabel({ unit })).toContain('الإيجار غير محدد');
  });

  it('allows available units and the currently selected edit unit only', () => {
    const availableUnit: ContractUnitOptionUnit = {
      id: 'unit-available',
      property_id: 'property-1',
      unit_number: 'A-1',
      status: 'available',
      rent_amount: 100,
    };
    const occupiedUnit: ContractUnitOptionUnit = {
      id: 'unit-occupied',
      property_id: 'property-1',
      unit_number: 'A-2',
      status: 'occupied',
      rent_amount: 200,
    };

    expect(isUnitSelectableForContract({ unit: availableUnit })).toBe(true);
    expect(isUnitSelectableForContract({ unit: occupiedUnit })).toBe(false);
    expect(isUnitSelectableForContract({ unit: occupiedUnit, currentLinkedUnitId: 'unit-occupied' })).toBe(true);
  });

  it('rejects units outside the selected property option set', () => {
    const units: ContractUnitOptionUnit[] = [{ id: 'unit-1', property_id: 'property-1', unit_number: 'A-1', status: 'available', rent_amount: 100 }];

    expect(getContractUnitSelectionIssue({ units, propertyId: 'property-2', unitId: 'unit-1' })).toBe('الوحدة المختارة لا تتبع العقار المحدد');
    expect(getContractUnitSelectionIssue({ units, propertyId: 'property-1', unitId: 'missing-unit' })).toBe('اختر وحدة من قائمة العقار المحدد');
  });

  it('rejects unavailable units except the currently linked edit unit', () => {
    const units: ContractUnitOptionUnit[] = [{ id: 'unit-occupied', property_id: 'property-1', unit_number: 'A-2', status: 'occupied', rent_amount: 200 }];

    expect(getContractUnitSelectionIssue({ units, propertyId: 'property-1', unitId: 'unit-occupied' })).toBe('لا يمكن إنشاء عقد على وحدة غير متاحة');
    expect(getContractUnitSelectionIssue({ units, propertyId: 'property-1', unitId: 'unit-occupied', currentLinkedUnitId: 'unit-occupied' })).toBeNull();
  });
});
