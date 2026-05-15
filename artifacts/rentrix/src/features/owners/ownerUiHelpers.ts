import type { Owner, PropertyOwner, PropertyOwnerUpdatePayload, PropertyWithOwners } from './ownerService';

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

export type PropertyOwnershipLinkFormValues = {
  property_id: string;
  ownership_percentage: string;
  is_primary: boolean;
  starts_on: string;
  ends_on: string;
};

export const emptyPropertyOwnershipLinkFormValues: PropertyOwnershipLinkFormValues = {
  property_id: '',
  ownership_percentage: '100',
  is_primary: true,
  starts_on: '',
  ends_on: '',
};

export function validatePropertyOwnershipLinkForm(values: PropertyOwnershipLinkFormValues): string | null {
  if (!values.property_id) {
    return 'اختر العقار أولاً';
  }

  if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) {
    return 'تاريخ نهاية الملكية يجب ألا يسبق تاريخ البداية';
  }

  return null;
}

type PropertyOwnerFormFields = Pick<PropertyOwner, 'property_id' | 'ownership_percentage' | 'is_primary' | 'starts_on' | 'ends_on'>;

export function propertyOwnerLinkToFormValues(link: PropertyOwnerFormFields): PropertyOwnershipLinkFormValues {
  return {
    property_id: link.property_id,
    ownership_percentage: String(link.ownership_percentage),
    is_primary: link.is_primary,
    starts_on: link.starts_on ?? '',
    ends_on: link.ends_on ?? '',
  };
}

export function propertyOwnershipLinkFormToPayload(values: PropertyOwnershipLinkFormValues): PropertyOwnerUpdatePayload {
  return {
    ownership_percentage: Number(values.ownership_percentage),
    is_primary: values.is_primary,
    starts_on: values.starts_on,
    ends_on: values.ends_on,
  };
}

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
  if (!owner) {
    return emptyOwnerFormValues;
  }

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
  if (!values.full_name.trim()) {
    return 'اسم المالك مطلوب';
  }

  if (values.email.trim() && !values.email.includes('@')) {
    return 'البريد الإلكتروني غير صالح';
  }

  return null;
}

export function getOwnerDisplayLabel(owner: Pick<Owner, 'full_name' | 'display_name'>): string {
  return owner.display_name?.trim() || owner.full_name;
}

export function summarizeOwners(owners: Owner[], properties: PropertyWithOwners[]): OwnerSummary {
  const linkedPropertyIds = new Set<string>();

  for (const property of properties) {
    if (property.property_owners.length > 0) {
      linkedPropertyIds.add(property.id);
    }
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
