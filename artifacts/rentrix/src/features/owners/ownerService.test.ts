import { describe, expect, it } from 'vitest';
import { getActiveOwnerLinks, getOwnerActivePropertyCount, getOwnerDisplayName, getPropertyOwnerDisplayName } from './ownerService';
import type { Owner, PropertyWithOwners } from './ownerService';

const owner: Owner = {
  id: 'owner-1',
  full_name: 'مالك أساسي',
  display_name: null,
  phone: null,
  email: null,
  national_id: null,
  tax_number: null,
  address: null,
  notes: null,
  is_active: true,
  created_at: '2026-06-04T00:00:00.000Z',
  updated_at: '2026-06-04T00:00:00.000Z',
};

function propertyWithOwner(ownerId: string, endsOn: string | null = null): PropertyWithOwners {
  return {
    id: `property-${ownerId}-${endsOn ?? 'active'}`,
    title: 'عقار موثق',
    type: 'سكني',
    address: 'مسقط',
    owner_name: 'مالك نصي',
    purchase_value: null,
    current_value: null,
    status: 'active',
    notes: null,
    created_at: '2026-06-04T00:00:00.000Z',
    updated_at: '2026-06-04T00:00:00.000Z',
    deleted_at: null,
    property_owners: [{
      id: `link-${ownerId}`,
      property_id: 'property-1',
      owner_id: ownerId,
      ownership_percentage: 100,
      is_primary: true,
      starts_on: null,
      ends_on: endsOn,
      created_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
      owner: { ...owner, id: ownerId, display_name: 'مالك مرتبط' },
    }],
  };
}

describe('owner read helpers', () => {
  it('uses display names safely', () => {
    expect(getOwnerDisplayName({ ...owner, display_name: '  اسم مختصر  ' })).toBe('اسم مختصر');
    expect(getOwnerDisplayName(owner)).toBe('مالك أساسي');
  });

  it('prefers active relationship owners over legacy property text', () => {
    expect(getPropertyOwnerDisplayName(propertyWithOwner('owner-1'))).toBe('مالك مرتبط');
    expect(getPropertyOwnerDisplayName(propertyWithOwner('owner-1', '2026-06-04'))).toBe('مالك نصي');
  });

  it('counts only active owner links', () => {
    const activeProperty = propertyWithOwner('owner-1');
    const endedProperty = propertyWithOwner('owner-1', '2026-06-04');

    expect(getActiveOwnerLinks(activeProperty)).toHaveLength(1);
    expect(getActiveOwnerLinks(endedProperty)).toHaveLength(0);
    expect(getOwnerActivePropertyCount('owner-1', [activeProperty, endedProperty])).toBe(1);
  });
});
