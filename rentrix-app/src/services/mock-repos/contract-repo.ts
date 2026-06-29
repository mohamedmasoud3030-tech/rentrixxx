import type { LeaseContract } from '@/domain/types';
import { validateContractFitsAgreement, validateContractOverlap, validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type ContractCreateInput = Readonly<Omit<LeaseContract, 'id' | 'createdAt' | 'status'>>;

export const contractRepo = {
  list: () => readMockDatabase((state) => state.contracts),
  getById: (contractId: string) => readMockDatabase((state) => state.contracts.find((contract) => contract.id === contractId) ?? null),
  create: (input: ContractCreateInput) => writeMockDatabase((state) => {
    const unit = state.units.find((candidate) => candidate.id === input.unitId && !candidate.isArchived);
    if (!unit || unit.status !== 'vacant') {
      throw new MockRepositoryError('يجب اختيار وحدة شاغرة ونشطة قبل إنشاء العقد.');
    }
    const tenantExists = state.tenants.some((tenant) => tenant.id === input.tenantId && !tenant.isArchived);
    if (!tenantExists) {
      throw new MockRepositoryError('يجب اختيار مستأجر نشط قبل إنشاء العقد.');
    }
    const agreement = state.agreements.find((candidate) => candidate.id === input.agreementId);
    if (!agreement) {
      throw new MockRepositoryError('اتفاقية التشغيل غير موجودة.');
    }
    const amountCheck = validatePositiveAmount(input.rentAmount);
    if (!amountCheck.isValid) {
      throw new MockRepositoryError(amountCheck.message ?? 'قيمة الإيجار غير صالحة.');
    }
    const contract: LeaseContract = {
      ...input,
      id: `contract-${crypto.randomUUID()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const fitCheck = validateContractFitsAgreement(contract, agreement);
    if (!fitCheck.isValid) {
      throw new MockRepositoryError(fitCheck.message ?? 'العقد لا يطابق اتفاقية التشغيل.');
    }
    const overlapCheck = validateContractOverlap(contract, [...state.contracts]);
    if (!overlapCheck.isValid) {
      throw new MockRepositoryError(overlapCheck.message ?? 'يوجد تداخل في تواريخ العقود.');
    }
    return {
      nextState: {
        ...state,
        contracts: [...state.contracts, contract],
        units: state.units.map((candidate) => candidate.id === unit.id ? { ...candidate, status: 'occupied' } : candidate),
      },
      data: contract,
    };
  }),
  terminate: (contractId: string, terminationDate: string, _reason?: string) => writeMockDatabase((state) => {
    const existing = state.contracts.find((contract) => contract.id === contractId);
    if (!existing || existing.status !== 'active') {
      throw new MockRepositoryError('لا يمكن إنهاء عقد غير نشط.');
    }
    const updatedContract: LeaseContract = {
      ...existing,
      status: 'terminated',
      endDate: terminationDate || existing.endDate,
    };
    const contracts = state.contracts.map((contract) => contract.id === contractId ? updatedContract : contract);

    const isOccupied = contracts.some((contract) => contract.unitId === existing.unitId && (contract.status === 'active' || contract.status === 'draft'));
    const units = state.units.map((unit) => unit.id === existing.unitId ? { ...unit, status: isOccupied ? 'occupied' as const : 'vacant' as const } : unit);

    return { nextState: { ...state, contracts, units }, data: updatedContract };
  }),
  renew: (contractId: string, input: { startDate: string; endDate: string; rentAmount: number; paymentFrequency: LeaseContract['paymentFrequency'] }) => writeMockDatabase((state) => {
    const existing = state.contracts.find((contract) => contract.id === contractId);
    if (!existing) {
      throw new MockRepositoryError('العقد القديم غير موجود.');
    }
    const agreement = state.agreements.find((candidate) => candidate.id === existing.agreementId);
    if (!agreement) {
      throw new MockRepositoryError('اتفاقية التشغيل غير موجودة.');
    }
    const amountCheck = validatePositiveAmount(input.rentAmount);
    if (!amountCheck.isValid) {
      throw new MockRepositoryError(amountCheck.message ?? 'قيمة الإيجار غير صالحة.');
    }
    const newContract: LeaseContract = {
      id: `contract-${crypto.randomUUID()}`,
      tenantId: existing.tenantId,
      unitId: existing.unitId,
      propertyId: existing.propertyId,
      agreementId: existing.agreementId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'active',
      rentAmount: input.rentAmount,
      paymentFrequency: input.paymentFrequency,
      createdAt: new Date().toISOString(),
    };
    const fitCheck = validateContractFitsAgreement(newContract, agreement);
    if (!fitCheck.isValid) {
      throw new MockRepositoryError(fitCheck.message ?? 'العقد الجديد لا يطابق اتفاقية التشغيل.');
    }
    const otherContracts = state.contracts.map((contract) => contract.id === contractId ? { ...contract, status: 'expired' as const } : contract);
    const overlapCheck = validateContractOverlap(newContract, otherContracts);
    if (!overlapCheck.isValid) {
      throw new MockRepositoryError(overlapCheck.message ?? 'يوجد تداخل في تواريخ العقود.');
    }
    const contracts = [...otherContracts, newContract];
    return {
      nextState: {
        ...state,
        contracts,
      },
      data: newContract,
    };
  }),
};
