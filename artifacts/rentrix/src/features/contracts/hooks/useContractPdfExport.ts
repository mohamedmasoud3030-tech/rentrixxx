import type { Person, Property, Unit } from '@/types/domain';
import type { ContractDetail } from '../services/contractService';

export const toPdfTenant = (person: ContractDetail['people'], fallbackTimestamp: string): Person | null =>
  person
    ? {
        ...person,
        type: 'tenant',
        address: null,
        notes: null,
        created_at: fallbackTimestamp,
        updated_at: fallbackTimestamp,
        deleted_at: null,
      }
    : null;

export const toPdfUnit = (unit: ContractDetail['units'], propertyId: string, fallbackTimestamp: string): Unit | null =>
  unit
    ? {
        ...unit,
        property_id: propertyId,
        notes: null,
        created_at: fallbackTimestamp,
        updated_at: fallbackTimestamp,
        deleted_at: null,
      }
    : null;

export const toPdfProperty = (property: ContractDetail['properties'], fallbackTimestamp: string): Property | null =>
  property
    ? {
        ...property,
        type: 'residential',
        owner_name: null,
        purchase_value: null,
        current_value: null,
        status: 'active',
        notes: null,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
        created_at: fallbackTimestamp,
        updated_at: fallbackTimestamp,
        deleted_at: null,
      }
    : null;
