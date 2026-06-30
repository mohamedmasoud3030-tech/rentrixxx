import { describe, expect, it } from 'vitest';
import { ContractsListPage } from './ContractsListPage';
import { ContractsRouteComponent } from '@/routes/_protected.contracts';

describe('contracts route wiring', () => {
  it('ContractsRouteComponent points to ContractsListPage (Supabase-backed)', () => {
    expect(ContractsRouteComponent).toBe(ContractsListPage);
  });
});
