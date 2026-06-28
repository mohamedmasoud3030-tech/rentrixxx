import { describe, expect, it, beforeEach } from 'vitest';
import { mockDatabaseSeed, useMockDatabaseStore } from './mock-db-store';
import { agreementRepo, contractRepo, expenseRepo, invoiceRepo, ownerRepo, propertyRepo, receiptRepo, tenantRepo, unitRepo, MockRepositoryError } from '@/services/mock-repos';

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

  it('creates active owner agreements only for connected active owners and properties', async () => {
    await expect(agreementRepo.create({
      ownerId: 'owner-al-sharif',
      propertyId: 'property-al-nakheel',
      agreementType: 'property_management',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
      commissionRate: 7,
      fixedFee: 1000,
    })).resolves.toMatchObject({ data: { ownerId: 'owner-al-sharif', propertyId: 'property-al-nakheel', status: 'active' } });
  });

  it('creates units only under active properties with finite positive rent', async () => {
    await expect(unitRepo.create({
      propertyId: 'property-al-nakheel',
      name: 'مكتب 301',
      rentAmount: 48000,
      status: 'vacant',
    })).resolves.toMatchObject({ data: { propertyId: 'property-al-nakheel', status: 'vacant' } });

    await expect(unitRepo.create({
      propertyId: 'property-missing',
      name: 'وحدة غير صالحة',
      rentAmount: 1000,
      status: 'vacant',
    })).rejects.toThrow(MockRepositoryError);
  });

  it('creates tenants and blocks archiving tenants with active contracts', async () => {
    const created = await tenantRepo.create({ name: 'سارة القحطاني', phone: '+966544444444', email: 'sarah@example.com' });

    expect(useMockDatabaseStore.getState().tenants).toContainEqual(created.data);
    await expect(tenantRepo.archive('tenant-faisal')).rejects.toThrow(MockRepositoryError);
  });

  it('creates invoices only for existing contracts with valid due dates and positive amounts', async () => {
    await expect(invoiceRepo.create({
      contractId: 'contract-yasmin-101-faisal',
      amount: 3000,
      dueDate: '2026-04-05',
      status: 'unpaid',
    })).resolves.toMatchObject({ data: { contractId: 'contract-yasmin-101-faisal', status: 'unpaid' } });

    await expect(invoiceRepo.create({
      contractId: 'contract-missing',
      amount: 3000,
      dueDate: '2026-04-05',
      status: 'unpaid',
    })).rejects.toThrow(MockRepositoryError);
  });

  it('creates payment receipts from unpaid invoices and updates invoice payment status', async () => {
    const receipt = await receiptRepo.create({
      invoiceId: 'invoice-yasmin-mar',
      amount: 1500,
      paymentDate: '2026-03-10',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRX-1500',
    });

    expect(receipt.data.invoiceId).toBe('invoice-yasmin-mar');
    expect(useMockDatabaseStore.getState().receipts).toContainEqual(receipt.data);
    expect(useMockDatabaseStore.getState().invoices.find((invoice) => invoice.id === 'invoice-yasmin-mar')?.status).toBe('partially_paid');
  });

  it('creates property expenses only for connected active property and optional unit links', async () => {
    await expect(expenseRepo.create({
      propertyId: 'property-al-yasmin',
      unitId: 'unit-yasmin-101',
      amount: 750,
      expenseDate: '2026-03-15',
      description: 'صيانة تكييف',
      responsibility: 'owner',
    })).resolves.toMatchObject({ data: { propertyId: 'property-al-yasmin', unitId: 'unit-yasmin-101', isArchived: false } });

    await expect(expenseRepo.create({
      propertyId: 'property-al-yasmin',
      unitId: 'unit-waha-a1',
      amount: 750,
      expenseDate: '2026-03-15',
      description: 'ربط وحدة غير صحيح',
      responsibility: 'office',
    })).rejects.toThrow(MockRepositoryError);
  });

});
