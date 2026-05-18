import { describe, expect, it } from 'vitest';
import { buildContractUnitOptionLabel, isUnitSelectableForContract, type ContractUnitOptionUnit } from './contract-unit-options';

describe('contract unit option helpers', () => {
  it('builds labels with property, address, unit number, visible status, and rent amount', () => {
    const unit: ContractUnitOptionUnit = {
      id: 'unit-1',
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
      unit_number: 'A-1',
      status: 'available',
      rent_amount: 100,
    };
    const occupiedUnit: ContractUnitOptionUnit = {
      id: 'unit-occupied',
      unit_number: 'A-2',
      status: 'occupied',
      rent_amount: 200,
    };

    expect(isUnitSelectableForContract({ unit: availableUnit })).toBe(true);
    expect(isUnitSelectableForContract({ unit: occupiedUnit })).toBe(false);
    expect(isUnitSelectableForContract({ unit: occupiedUnit, selectedUnitId: 'unit-occupied' })).toBe(true);
  });
});
