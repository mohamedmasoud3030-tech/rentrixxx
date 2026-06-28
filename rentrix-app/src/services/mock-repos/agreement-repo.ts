import type { OwnerAgreement } from '@/domain/types';
import { isValidISODateString, validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type AgreementCreateInput = Readonly<Omit<OwnerAgreement, 'id' | 'createdAt' | 'status' | 'isArchived'>>;

function assertValidAgreementDates(input: AgreementCreateInput): void {
  if (!isValidISODateString(input.startDate) || (input.endDate && !isValidISODateString(input.endDate))) {
    throw new MockRepositoryError('تواريخ اتفاقية التشغيل غير صالحة.');
  }
  if (input.endDate && input.startDate > input.endDate) {
    throw new MockRepositoryError('تاريخ بداية الاتفاقية يجب أن يسبق تاريخ النهاية.');
  }
}

function assertOptionalPositiveAmount(value: number | undefined, message: string): void {
  if (value === undefined) return;
  const result = validatePositiveAmount(value);
  if (!result.isValid) throw new MockRepositoryError(result.message ?? message);
}

export const agreementRepo = {
  list: () => readMockDatabase((state) => state.agreements.filter((agreement) => !agreement.isArchived)),
  getById: (agreementId: string) => readMockDatabase((state) => state.agreements.find((agreement) => agreement.id === agreementId) ?? null),
  create: (input: AgreementCreateInput) => writeMockDatabase((state) => {
    const owner = state.owners.find((candidate) => candidate.id === input.ownerId && !candidate.isArchived);
    if (!owner) throw new MockRepositoryError('يجب ربط الاتفاقية بمالك نشط.');

    const property = state.properties.find((candidate) => candidate.id === input.propertyId && !candidate.isArchived);
    if (!property || property.ownerId !== input.ownerId) {
      throw new MockRepositoryError('يجب ربط الاتفاقية بعقار نشط يخص المالك المحدد.');
    }

    assertValidAgreementDates(input);
    assertOptionalPositiveAmount(input.commissionRate, 'نسبة العمولة غير صالحة.');
    assertOptionalPositiveAmount(input.fixedFee, 'الرسوم الثابتة غير صالحة.');

    const agreement: OwnerAgreement = {
      ...input,
      id: `agreement-${crypto.randomUUID()}`,
      status: 'active',
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    return { nextState: { ...state, agreements: [...state.agreements, agreement] }, data: agreement };
  }),
  archive: (agreementId: string) => writeMockDatabase((state) => {
    const hasActiveContract = state.contracts.some((contract) => contract.agreementId === agreementId && (contract.status === 'active' || contract.status === 'draft'));
    if (hasActiveContract) throw new MockRepositoryError('لا يمكن أرشفة اتفاقية مرتبطة بعقود نشطة أو مسودات.');

    const agreements = state.agreements.map((agreement) => agreement.id === agreementId ? { ...agreement, isArchived: true } : agreement);
    return { nextState: { ...state, agreements }, data: agreements.find((agreement) => agreement.id === agreementId) ?? null };
  }),
};
