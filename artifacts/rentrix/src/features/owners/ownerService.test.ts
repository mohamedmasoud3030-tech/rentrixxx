import { describe, expect, it } from 'vitest';
import {
  getPropertyOwnerDisplayName,
  normalizeOwnerPayload,
  normalizeOwnerUpdatePayload,
  normalizeOwnershipPercentage,
  normalizePropertyOwnerPayload,
} from './ownerService';

describe('ownerService normalization helpers', () => {
  it('trims owner strings and converts blank optional strings to null', () => {
    expect(normalizeOwnerPayload({
      full_name: '  شركة المالك  ',
      display_name: '  المالك  ',
      phone: '   ',
      email: ' owner@example.com ',
      is_active: false,
    })).toMatchObject({
      full_name: 'شركة المالك',
      display_name: 'المالك',
      phone: null,
      email: 'owner@example.com',
      is_active: false,
    });
  });

  it('rejects blank owner names for create and update payloads', () => {
    expect(() => normalizeOwnerPayload({ full_name: '   ' })).toThrow('اسم المالك مطلوب');
    expect(() => normalizeOwnerUpdatePayload({ full_name: '' })).toThrow('اسم المالك مطلوب');
  });

  it('normalizes safe ownership percentages and rejects invalid values', () => {
    expect(normalizeOwnershipPercentage(undefined)).toBe(100);
    expect(normalizeOwnershipPercentage('33.333')).toBe(33.33);
    expect(() => normalizeOwnershipPercentage(0)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage(101)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage('not-a-number')).toThrow('نسبة الملكية');
  });

  it('normalizes property owner links with required ids and optional dates', () => {
    expect(normalizePropertyOwnerPayload({
      property_id: ' property-1 ',
      owner_id: ' owner-1 ',
      ownership_percentage: '25.5',
      is_primary: false,
      starts_on: ' 2026-05-01 ',
      ends_on: ' ',
    })).toEqual({
      property_id: 'property-1',
      owner_id: 'owner-1',
      ownership_percentage: 25.5,
      is_primary: false,
      starts_on: '2026-05-01',
      ends_on: null,
    });
  });

  it('uses relationship owner names before falling back to legacy owner_name', () => {
    expect(getPropertyOwnerDisplayName({
      owner_name: 'مالك نصي',
      property_owners: [{ owner: { full_name: 'مالك مرتبط', display_name: null } }],
    } as Parameters<typeof getPropertyOwnerDisplayName>[0])).toBe('مالك مرتبط');

    expect(getPropertyOwnerDisplayName({ owner_name: ' مالك نصي ' })).toBe('مالك نصي');
  });
});
