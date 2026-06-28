import type { Owner } from '@/domain/types';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type OwnerCreateInput = Readonly<Pick<Owner, 'name' | 'phone' | 'email'>>;

export const ownerRepo = {
  list: () => readMockDatabase((state) => state.owners.filter((owner) => !owner.isArchived)),
  getById: (ownerId: string) => readMockDatabase((state) => state.owners.find((owner) => owner.id === ownerId) ?? null),
  create: (input: OwnerCreateInput) => writeMockDatabase((state) => {
    const owner: Owner = {
      id: `owner-${crypto.randomUUID()}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    return { nextState: { ...state, owners: [...state.owners, owner] }, data: owner };
  }),
  archive: (ownerId: string) => writeMockDatabase((state) => {
    const hasActiveAgreement = state.agreements.some((agreement) => agreement.ownerId === ownerId && !agreement.isArchived && (agreement.status === 'active' || agreement.status === 'draft'));
    if (hasActiveAgreement) {
      throw new MockRepositoryError('لا يمكن أرشفة مالك لديه اتفاقيات نشطة أو مسودات.');
    }
    const owners = state.owners.map((owner) => owner.id === ownerId ? { ...owner, isArchived: true } : owner);
    return { nextState: { ...state, owners }, data: owners.find((owner) => owner.id === ownerId) ?? null };
  }),
};
