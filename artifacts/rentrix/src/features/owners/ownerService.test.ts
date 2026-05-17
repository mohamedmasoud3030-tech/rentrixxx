import { readFileSync } from 'node:fs';
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
    expect(normalizeOwnershipPercentage(null)).toBe(100);
    expect(normalizeOwnershipPercentage('')).toBe(100);
    expect(normalizeOwnershipPercentage('33.333')).toBe(33.33);
    expect(() => normalizeOwnershipPercentage(0)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage(101)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage('not-a-number')).toThrow('نسبة الملكية');
  });

  it('rounds ownership percentages before enforcing database constraint boundaries', () => {
    expect(normalizeOwnershipPercentage(0.005)).toBe(0.01);
    expect(normalizeOwnershipPercentage('0.005')).toBe(0.01);
    expect(normalizeOwnershipPercentage(100.004)).toBe(100);
    expect(normalizeOwnershipPercentage('100.004')).toBe(100);
    expect(() => normalizeOwnershipPercentage(0.004)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage('0.004')).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage(100.005)).toThrow('نسبة الملكية');
    expect(() => normalizeOwnershipPercentage('100.005')).toThrow('نسبة الملكية');
  });

  it('normalizes property owner links with primary flags and optional dates', () => {
    expect(normalizePropertyOwnerPayload({
      property_id: ' property-1 ',
      owner_id: ' owner-1 ',
      ownership_percentage: '25.5',
      is_primary: false,
      starts_on: ' 2026-05-01 ',
      ends_on: ' 2026-06-01 ',
    })).toEqual({
      property_id: 'property-1',
      owner_id: 'owner-1',
      ownership_percentage: 25.5,
      is_primary: false,
      starts_on: '2026-05-01',
      ends_on: '2026-06-01',
    });

    expect(normalizePropertyOwnerPayload({
      property_id: 'property-1',
      owner_id: 'owner-1',
      ends_on: ' ',
    })).toMatchObject({
      ownership_percentage: 100,
      is_primary: true,
      starts_on: null,
      ends_on: null,
    });
  });

  it('rejects rounded-zero ownership percentages before database writes', () => {
    expect(() => normalizePropertyOwnerPayload({
      property_id: 'property-1',
      owner_id: 'owner-1',
      ownership_percentage: 0.004,
    })).toThrow('نسبة الملكية');
  });

  it('uses active relationship owner names before falling back to legacy owner_name', () => {
    expect(getPropertyOwnerDisplayName({
      owner_name: 'مالك نصي',
      property_owners: [{ ends_on: null, owner: { full_name: 'مالك مرتبط', display_name: null } }],
    } as Parameters<typeof getPropertyOwnerDisplayName>[0])).toBe('مالك مرتبط');

    expect(getPropertyOwnerDisplayName({
      owner_name: ' مالك نصي ',
      property_owners: [{ ends_on: '2026-05-16', owner: { full_name: 'مالك سابق', display_name: null } }],
    } as Parameters<typeof getPropertyOwnerDisplayName>[0])).toBe('مالك نصي');
    expect(getPropertyOwnerDisplayName({ owner_name: ' مالك نصي ' })).toBe('مالك نصي');
  });

  it('soft-ends owner-property relationships instead of hard deleting them', () => {
    const ownerServiceSource = readFileSync(new URL('./ownerService.ts', import.meta.url), 'utf8');

    expect(ownerServiceSource).toContain('.update({ ends_on:');
    expect(ownerServiceSource).not.toContain('.delete()');
  });
});


describe('owner relationship migration protections', () => {
  const ownerMigrationSql = readFileSync(
    new URL('../../../../../supabase/migrations/20260515130000_owner_relationship_foundation.sql', import.meta.url),
    'utf8',
  );

  it('protects against multiple active primary owners per property', () => {
    expect(ownerMigrationSql).toContain('property_owners_active_primary_unique_idx');
    expect(ownerMigrationSql).toContain('Only one active primary owner is allowed per property.');
    expect(ownerMigrationSql).toContain('where ends_on is null and is_primary');
  });

  it('protects active ownership percentage totals from exceeding 100 percent', () => {
    expect(ownerMigrationSql).toContain('validate_property_owner_active_totals');
    expect(ownerMigrationSql).toContain('v_other_active_percentage_total + new.ownership_percentage > 100');
    expect(ownerMigrationSql).toContain('Active ownership percentages for a property cannot exceed 100.');
  });
});
