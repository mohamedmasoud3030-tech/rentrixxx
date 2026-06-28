import type { Unit } from '@/domain/types';
import { validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type UnitCreateInput = Readonly<Omit<Unit, 'id' | 'createdAt' | 'isArchived'>>;

export const unitRepo = {
  list: () => readMockDatabase((state) => state.units.filter((unit) => !unit.isArchived)),
  getById: (unitId: string) => readMockDatabase((state) => state.units.find((unit) => unit.id === unitId) ?? null),
  create: (input: UnitCreateInput) => writeMockDatabase((state) => {
    const propertyExists = state.properties.some((property) => property.id === input.propertyId && !property.isArchived);
    if (!propertyExists) throw new MockRepositoryError('يجب ربط الوحدة بعقار نشط.');

    const amountCheck = validatePositiveAmount(input.rentAmount);
    if (!amountCheck.isValid) throw new MockRepositoryError(amountCheck.message ?? 'قيمة إيجار الوحدة غير صالحة.');

    const unit: Unit = {
      ...input,
      id: `unit-${crypto.randomUUID()}`,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    return { nextState: { ...state, units: [...state.units, unit] }, data: unit };
  }),
  archive: (unitId: string) => writeMockDatabase((state) => {
    const hasActiveContract = state.contracts.some((contract) => contract.unitId === unitId && (contract.status === 'active' || contract.status === 'draft'));
    if (hasActiveContract) throw new MockRepositoryError('لا يمكن أرشفة وحدة مرتبطة بعقود نشطة أو مسودات.');

    const units = state.units.map((unit) => unit.id === unitId ? { ...unit, isArchived: true } : unit);
    return { nextState: { ...state, units }, data: units.find((unit) => unit.id === unitId) ?? null };
  }),
};
