import type { Tenant } from '@/domain/types';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type TenantCreateInput = Readonly<Pick<Tenant, 'name' | 'phone' | 'email'>>;

export const tenantRepo = {
  list: () => readMockDatabase((state) => state.tenants.filter((tenant) => !tenant.isArchived)),
  getById: (tenantId: string) => readMockDatabase((state) => state.tenants.find((tenant) => tenant.id === tenantId) ?? null),
  create: (input: TenantCreateInput) => writeMockDatabase((state) => {
    const tenant: Tenant = {
      id: `tenant-${crypto.randomUUID()}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    return { nextState: { ...state, tenants: [...state.tenants, tenant] }, data: tenant };
  }),
  update: (tenantId: string, input: TenantCreateInput) => writeMockDatabase((state) => {
    const existing = state.tenants.find((tenant) => tenant.id === tenantId);
    if (!existing) throw new MockRepositoryError('المستأجر غير موجود.');

    const updatedTenant: Tenant = {
      ...existing,
      name: input.name,
      phone: input.phone,
      email: input.email,
    };

    const tenants = state.tenants.map((tenant) => tenant.id === tenantId ? updatedTenant : tenant);
    return { nextState: { ...state, tenants }, data: updatedTenant };
  }),
  archive: (tenantId: string) => writeMockDatabase((state) => {
    const hasActiveContract = state.contracts.some((contract) => contract.tenantId === tenantId && (contract.status === 'active' || contract.status === 'draft'));
    if (hasActiveContract) throw new MockRepositoryError('لا يمكن أرشفة مستأجر مرتبط بعقود نشطة أو مسودات.');

    const tenants = state.tenants.map((tenant) => tenant.id === tenantId ? { ...tenant, isArchived: true } : tenant);
    return { nextState: { ...state, tenants }, data: tenants.find((tenant) => tenant.id === tenantId) ?? null };
  }),
};
