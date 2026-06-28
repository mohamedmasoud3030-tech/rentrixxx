import { describe, expect, it, beforeEach } from 'vitest';
import { mockDatabaseSeed, useMockDatabaseStore } from './mock-db-store';
import { contractRepo, ownerRepo, propertyRepo, MockRepositoryError } from '@/services/mock-repos';

describe('mock local database foundation', () => {
  beforeEach(() => {
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('ships connected Arabic seed data for the Phase 2 local model', () => {
    const state = useMockDatabaseStore.getState();

    expect(state.owners).toHaveLength(2);
    expect(state.agreements).toHaveLength(2);
    expect(state.properties).toHaveLength(3);
    expect(state.units).toHaveLength(5);
    expect(state.tenants).toHaveLength(2);
    expect(state.contracts).toHaveLength(1);
    expect(state.invoices).toHaveLength(3);
    expect(state.properties.map((property) => property.name)).toContain('برج الياسمين');
  });

  it('persists mutations through the Zustand store boundary', async () => {
    const result = await ownerRepo.create({ name: 'مالك تجريبي', phone: '+966533333333', email: 'demo@example.com' });

    expect(result.data.name).toBe('مالك تجريبي');
    expect(useMockDatabaseStore.getState().owners).toContainEqual(result.data);
    expect(mockDatabaseSeed.owners).toHaveLength(2);
  });

  it('blocks archiving an owner with active agreements', async () => {
    await expect(ownerRepo.archive('owner-al-sharif')).rejects.toThrow(MockRepositoryError);
  });

  it('validates relationships before creating active contracts', async () => {
    await expect(contractRepo.create({
      tenantId: 'tenant-noura',
      unitId: 'unit-yasmin-102',
      propertyId: 'property-al-yasmin',
      agreementId: 'agreement-yasmin-management',
      startDate: '2026-04-01',
      endDate: '2026-10-31',
      rentAmount: 34000,
      paymentFrequency: 'monthly',
    })).resolves.toMatchObject({ data: { tenantId: 'tenant-noura', status: 'active' } });

    expect(useMockDatabaseStore.getState().units.find((unit) => unit.id === 'unit-yasmin-102')?.status).toBe('occupied');
  });

  it('blocks properties that point to archived or missing owners', async () => {
    await expect(propertyRepo.create({ name: 'عقار غير صالح', address: 'عنوان تجريبي', ownerId: 'owner-missing' })).rejects.toThrow(MockRepositoryError);
  });
});
