import { describe, expect, it } from 'vitest';
import { emptyOwnerFormValues, emptyPropertyOwnershipLinkFormValues, summarizeOwners, validateOwnerForm, validatePropertyOwnershipLinkForm } from './ownerUiHelpers';
import type { Owner, PropertyWithOwners } from './ownerService';

const baseOwner: Owner = {
  id: 'owner-1',
  full_name: 'مالك نشط',
  display_name: null,
  phone: null,
  email: null,
  national_id: null,
  tax_number: null,
  address: null,
  notes: null,
  is_active: true,
  created_at: '2026-05-15T00:00:00.000Z',
  updated_at: '2026-05-15T00:00:00.000Z',
};

function property(id: string, ownerIds: string[]): PropertyWithOwners {
  return {
    id,
    title: `عقار ${id}`,
    type: 'سكني',
    address: 'مسقط',
    owner_name: null,
    purchase_value: null,
    current_value: null,
    status: 'active',
    notes: null,
    created_at: '2026-05-15T00:00:00.000Z',
    updated_at: '2026-05-15T00:00:00.000Z',
    deleted_at: null,
    property_owners: ownerIds.map((ownerId) => ({
      id: `${id}-${ownerId}`,
      property_id: id,
      owner_id: ownerId,
      ownership_percentage: 100,
      is_primary: true,
      starts_on: null,
      ends_on: null,
      created_at: '2026-05-15T00:00:00.000Z',
      updated_at: '2026-05-15T00:00:00.000Z',
      owner: null,
    })),
  };
}

describe('owner UI helpers', () => {
  it('validates required owner names and light email format', () => {
    expect(validateOwnerForm(emptyOwnerFormValues)).toBe('اسم المالك مطلوب');
    expect(validateOwnerForm({ ...emptyOwnerFormValues, full_name: 'مالك', email: 'bad-email' })).toBe('البريد الإلكتروني غير صالح');
    expect(validateOwnerForm({ ...emptyOwnerFormValues, full_name: 'مالك', email: 'owner@example.com' })).toBeNull();
  });

  it('validates property ownership link date ranges', () => {
    expect(validatePropertyOwnershipLinkForm(emptyPropertyOwnershipLinkFormValues)).toBe('اختر العقار أولاً');
    expect(validatePropertyOwnershipLinkForm({
      ...emptyPropertyOwnershipLinkFormValues,
      property_id: 'property-1',
      starts_on: '2026-05-10',
      ends_on: '2026-05-09',
    })).toBe('تاريخ نهاية الملكية يجب ألا يسبق تاريخ البداية');
    expect(validatePropertyOwnershipLinkForm({
      ...emptyPropertyOwnershipLinkFormValues,
      property_id: 'property-1',
      starts_on: '2026-05-10',
      ends_on: '2026-05-10',
    })).toBeNull();
  });

  it('summarizes owners and property relationships without financial balances', () => {
    expect(summarizeOwners([
      baseOwner,
      { ...baseOwner, id: 'owner-2', is_active: false },
    ], [property('property-1', ['owner-1']), property('property-2', []), property('property-3', ['owner-1', 'owner-2'])])).toEqual({
      totalOwners: 2,
      activeOwners: 1,
      linkedPropertiesCount: 2,
      propertiesWithoutLinkedOwner: 1,
    });
  });
});
