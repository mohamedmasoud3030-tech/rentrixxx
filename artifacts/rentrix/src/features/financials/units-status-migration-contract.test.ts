import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../../supabase/migrations/20260603094500_normalize_units_status_contract.sql', import.meta.url),
  'utf8',
);

describe('units status reconciliation migration', () => {
  it('fails before mutation when unsupported live values exist', () => {
    expect(migration).toContain("btrim(lower(status::text)) not in ('available', 'occupied', 'rented', 'maintenance', 'reserved')");
    expect(migration).toContain("raise exception 'Cannot normalize public.units.status: unsupported values exist'");
  });

  it('stores the historical RENTED alias as the canonical occupied status', () => {
    expect(migration).toContain("when 'rented' then 'occupied'");
    expect(migration).toContain('create or replace trigger units_normalize_status_contract');
    expect(migration).toContain('before insert or update of status on public.units');
  });

  it('validates the final canonical stored-value contract', () => {
    expect(migration).toContain('constraint units_status_canonical_check');
    expect(migration).toContain("check (status::text in ('available', 'occupied', 'maintenance', 'reserved'))");
    expect(migration).toContain('validate constraint units_status_canonical_check');
  });
});
