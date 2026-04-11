import type { BaseEntity, EntityId } from '@/types/domain';

export interface OwnerEntity extends BaseEntity {
  name: string;
  phone: string;
  email?: string | null;
}

export interface TenantEntity extends BaseEntity {
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLIST';
}

export interface UnitEntity extends BaseEntity {
  propertyId: EntityId;
  name: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'ON_HOLD';
  rentDefault: number;
}
