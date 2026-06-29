import { describe, it, expect, beforeEach } from 'vitest';
import { useMockDatabaseStore } from '@/store/mock-db-store';
import { contractRepo, tenantRepo, MockRepositoryError } from '@/services/mock-repos';

// Actual seed IDs from mock-db-store.ts
const ACTIVE_CONTRACT  = 'contract-yasmin-101-faisal';
const ACTIVE_UNIT      = 'unit-yasmin-101';
const VACANT_UNIT      = 'unit-yasmin-102';
const TENANT_FAISAL    = 'tenant-faisal';   // has active contract
const TENANT_NOURA     = 'tenant-noura';    // no contracts
const AGREEMENT        = 'agreement-yasmin-management';
const PROPERTY         = 'property-al-yasmin';

describe('contractRepo — terminate', () => {
  beforeEach(() => {
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('terminates an active contract and frees the unit', async () => {
    const before = useMockDatabaseStore.getState();
    expect(before.units.find((u) => u.id === ACTIVE_UNIT)?.status).toBe('occupied');

    const result = await contractRepo.terminate(ACTIVE_CONTRACT, '2026-07-01', 'إنهاء مبكر');

    expect(result.data.status).toBe('terminated');
    expect(result.data.endDate).toBe('2026-07-01');

    const after = useMockDatabaseStore.getState();
    expect(after.units.find((u) => u.id === ACTIVE_UNIT)?.status).toBe('vacant');
  });

  it('rejects terminating a non-active contract', async () => {
    await contractRepo.terminate(ACTIVE_CONTRACT, '2026-07-01');
    await expect(
      contractRepo.terminate(ACTIVE_CONTRACT, '2026-08-01')
    ).rejects.toThrow(MockRepositoryError);
  });

  it('rejects terminating a non-existent contract', async () => {
    await expect(
      contractRepo.terminate('contract-ghost', '2026-07-01')
    ).rejects.toThrow(MockRepositoryError);
  });
});

describe('contractRepo — renew', () => {
  beforeEach(() => {
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('creates a new active contract and marks the old one expired', async () => {
    const result = await contractRepo.renew(ACTIVE_CONTRACT, {
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      rentAmount: 4000,
      paymentFrequency: 'monthly',
    });

    expect(result.data.status).toBe('active');
    expect(result.data.rentAmount).toBe(4000);
    expect(result.data.tenantId).toBe(TENANT_FAISAL);
    expect(result.data.unitId).toBe(ACTIVE_UNIT);

    const state = useMockDatabaseStore.getState();
    const oldContract = state.contracts.find((c) => c.id === ACTIVE_CONTRACT);
    expect(oldContract?.status).toBe('expired');
  });

  it('rejects renewing a non-existent contract', async () => {
    await expect(
      contractRepo.renew('contract-ghost', {
        startDate: '2027-01-01',
        endDate: '2028-01-01',
        rentAmount: 3000,
        paymentFrequency: 'monthly',
      })
    ).rejects.toThrow(MockRepositoryError);
  });

  it('rejects renewing with zero rent amount', async () => {
    await expect(
      contractRepo.renew(ACTIVE_CONTRACT, {
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        rentAmount: 0,
        paymentFrequency: 'monthly',
      })
    ).rejects.toThrow(MockRepositoryError);
  });
});

describe('contractRepo — create guard: occupied unit', () => {
  beforeEach(() => {
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('rejects creating a contract for an already-occupied unit', async () => {
    await expect(
      contractRepo.create({
        tenantId: TENANT_NOURA,
        unitId: ACTIVE_UNIT,
        propertyId: PROPERTY,
        agreementId: AGREEMENT,
        startDate: '2026-07-01',
        endDate: '2027-07-01',
        rentAmount: 3500,
        paymentFrequency: 'monthly',
      })
    ).rejects.toThrow(MockRepositoryError);
  });

  it('allows creating a contract for a vacant unit', async () => {
    const result = await contractRepo.create({
      tenantId: TENANT_NOURA,
      unitId: VACANT_UNIT,
      propertyId: PROPERTY,
      agreementId: AGREEMENT,
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      rentAmount: 3000,
      paymentFrequency: 'monthly',
    });

    expect(result.data.status).toBe('active');
    expect(result.data.unitId).toBe(VACANT_UNIT);

    const state = useMockDatabaseStore.getState();
    expect(state.units.find((u) => u.id === VACANT_UNIT)?.status).toBe('occupied');
  });
});

describe('tenantRepo — update and archive', () => {
  beforeEach(() => {
    useMockDatabaseStore.getState().resetDatabase();
  });

  it('updates tenant name and phone', async () => {
    const result = await tenantRepo.update(TENANT_FAISAL, {
      name: 'فيصل المعدّل',
      phone: '+966599999999',
    });

    expect(result.data?.name).toBe('فيصل المعدّل');
    const state = useMockDatabaseStore.getState();
    expect(state.tenants.find((t) => t.id === TENANT_FAISAL)?.name).toBe('فيصل المعدّل');
  });

  it('preserves unchanged fields on partial update', async () => {
    const before = useMockDatabaseStore.getState().tenants.find((t) => t.id === TENANT_FAISAL);
    await tenantRepo.update(TENANT_FAISAL, { name: 'اسم آخر', phone: '+966500000000' });
    const after = useMockDatabaseStore.getState().tenants.find((t) => t.id === TENANT_FAISAL);
    expect(after?.isArchived).toBe(before?.isArchived);
    expect(after?.createdAt).toBe(before?.createdAt);
  });

  it('blocks archiving tenant-faisal who has an active contract', async () => {
    await expect(tenantRepo.archive(TENANT_FAISAL)).rejects.toThrow(MockRepositoryError);
  });

  it('archives tenant-noura who has no contracts', async () => {
    const result = await tenantRepo.archive(TENANT_NOURA);
    expect(result.data?.isArchived).toBe(true);
    const state = useMockDatabaseStore.getState();
    expect(state.tenants.find((t) => t.id === TENANT_NOURA)?.isArchived).toBe(true);
  });

  it('archives tenant-faisal after their contract is terminated', async () => {
    await contractRepo.terminate(ACTIVE_CONTRACT, '2026-07-01');
    const result = await tenantRepo.archive(TENANT_FAISAL);
    expect(result.data?.isArchived).toBe(true);
  });
});
