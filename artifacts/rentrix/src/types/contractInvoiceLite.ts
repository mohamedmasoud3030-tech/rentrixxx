import type { Contract, Tenant } from '../types';

export type ContractLite = Pick<Contract, 'id' | 'tenantId'>;

export type TenantLite = Pick<Tenant, 'id' | 'name'>;

export interface InvoiceSearchContext {
  contracts: ContractLite[];
  tenants: TenantLite[];
}
