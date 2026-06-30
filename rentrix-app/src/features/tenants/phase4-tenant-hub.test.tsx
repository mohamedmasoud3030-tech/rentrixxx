import { describe, expect, it } from 'vitest';
import { TenantsPage } from './TenantsPage';
import { TenantsRouteComponent } from '@/routes/_protected.tenants';

describe('tenants route wiring', () => {
  it('TenantsRouteComponent points to TenantsPage (Supabase-backed)', () => {
    expect(TenantsRouteComponent).toBe(TenantsPage);
  });
});
