import type { BaseEntity, EntityId } from '@/types/domain';

export interface ContractModel extends BaseEntity {
  no?: string | null;
  unitId: EntityId;
  tenantId: EntityId;
  rentAmount: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  deposit: number;
  status: 'ACTIVE' | 'ENDED' | 'SUSPENDED';
}

export function isActive(contract: Pick<ContractModel, 'status' | 'startDate' | 'endDate'>, at = new Date()): boolean {
  if (contract.status !== 'ACTIVE') return false;
  const now = at.getTime();
  const start = new Date(contract.startDate).getTime();
  const end = new Date(contract.endDate).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
}
