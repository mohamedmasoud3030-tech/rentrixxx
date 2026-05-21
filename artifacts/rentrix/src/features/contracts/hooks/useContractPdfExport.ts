import type { Person, Property, Unit } from '@/types/domain';
import type { ContractDetail } from '../services/contractService';

export const toPdfTenant = (person: ContractDetail['people']): Person | null =>
  person
    ? {
        ...person,
        type: 'tenant',
        address: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;

export const toPdfUnit = (unit: ContractDetail['units'], propertyId: string): Unit | null =>
  unit
    ? {
        ...unit,
        property_id: propertyId,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;

export const toPdfProperty = (property: ContractDetail['properties']): Property | null =>
  property
    ? {
        ...property,
        type: 'residential',
        owner_name: null,
        purchase_value: null,
        current_value: null,
        status: 'active',
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }
    : null;
