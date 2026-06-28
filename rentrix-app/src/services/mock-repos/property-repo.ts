import type { Property } from '@/domain/types';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type PropertyCreateInput = Readonly<Pick<Property, 'name' | 'address' | 'ownerId'>>;

export const propertyRepo = {
  list: () => readMockDatabase((state) => state.properties.filter((property) => !property.isArchived)),
  getById: (propertyId: string) => readMockDatabase((state) => state.properties.find((property) => property.id === propertyId) ?? null),
  create: (input: PropertyCreateInput) => writeMockDatabase((state) => {
    if (input.ownerId && !state.owners.some((owner) => owner.id === input.ownerId && !owner.isArchived)) {
      throw new MockRepositoryError('يجب ربط العقار بمالك نشط.');
    }
    const property: Property = {
      id: `property-${crypto.randomUUID()}`,
      ownerId: input.ownerId,
      name: input.name,
      address: input.address,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    return { nextState: { ...state, properties: [...state.properties, property] }, data: property };
  }),
  archive: (propertyId: string) => writeMockDatabase((state) => {
    const hasActiveAgreement = state.agreements.some((agreement) => agreement.propertyId === propertyId && !agreement.isArchived && (agreement.status === 'active' || agreement.status === 'draft'));
    const hasActiveContract = state.contracts.some((contract) => contract.propertyId === propertyId && (contract.status === 'active' || contract.status === 'draft'));
    if (hasActiveAgreement || hasActiveContract) {
      throw new MockRepositoryError('لا يمكن أرشفة عقار مرتبط باتفاقيات أو عقود نشطة.');
    }
    const properties = state.properties.map((property) => property.id === propertyId ? { ...property, isArchived: true } : property);
    return { nextState: { ...state, properties }, data: properties.find((property) => property.id === propertyId) ?? null };
  }),
};
