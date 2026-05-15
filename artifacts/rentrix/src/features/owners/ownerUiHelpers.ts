import type { Owner, PropertyWithOwners } from './ownerService';

export type OwnerFormValues = {
  full_name: string;
  display_name: string;
  phone: string;
  email: string;
  national_id: string;
  tax_number: string;
  address: string;
  notes: string;
  is_active: boolean;
};

export type OwnerSummary = {
  totalOwners: number;
  activeOwners: number;
  linkedPropertiesCount: number;
  propertiesWithoutLinkedOwner: number;
};

export const emptyOwnerFormValues: OwnerFormValues = {
  full_name: '',
  display_name: '',
  phone: '',
  email: '',
  national_id: '',
  tax_number: '',
  address: '',
  notes: '',
  is_active: true,
};

export function ownerToFormValues(owner: Owner | null): OwnerFormValues {
  if (!owner) return emptyOwnerFormValues;

  return {
    full_name: owner.full_name,
    display_name: owner.display_name ?? '',
    phone: owner.phone ?? '',
    email: owner.email ?? '',
    national_id: owner.national_id ?? '',
    tax_number: owner.tax_number ?? '',
    address: owner.address ?? '',
    notes: owner.notes ?? '',
    is_active: owner.is_active,
  };
}

export function validateOwnerForm(values: OwnerFormValues): string | null {
  if (!values.full_name.trim()) return 'اسم المالك مطلوب';
  if (values.email.trim() && !values.email.includes('@')) return 'البريد الإلكتروني غير صالح';
  return null;
}

export function getOwnerDisplayLabel(owner: Pick<Owner, 'full_name' | 'display_name'>): string {
  return owner.display_name?.trim() || owner.full_name;
}

export function summarizeOwners(owners: Owner[], properties: PropertyWithOwners[]): OwnerSummary {
  const linkedPropertyIds = new Set<string>();

  for (const property of properties) {
    if (property.property_owners.length > 0) linkedPropertyIds.add(property.id);
  }

  return {
    totalOwners: owners.length,
    activeOwners: owners.filter((owner) => owner.is_active).length,
    linkedPropertiesCount: linkedPropertyIds.size,
    propertiesWithoutLinkedOwner: properties.filter((property) => property.property_owners.length === 0).length,
  };
}

export function countLinkedPropertiesForOwner(ownerId: string, properties: PropertyWithOwners[]): number {
  return properties.filter((property) => property.property_owners.some((link) => link.owner_id === ownerId)).length;
}
