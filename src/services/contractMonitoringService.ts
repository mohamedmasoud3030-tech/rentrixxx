import type { Contract, ContractBalance, Database } from '../types';
import { validateNonNegativeNumber } from '../utils/validation';

export type ContractHealthStatus = 'ACTIVE' | 'EXPIRING' | 'OVERDUE' | 'INACTIVE';

export interface ContractStatusSnapshot {
  contractId: string;
  status: ContractHealthStatus;
  daysToExpiry: number;
  overdueBalance: number;
}

const DAY_MS = 86400000;

export const getContractAlertWindowEnd = (now: Date, alertDays: number): Date => {
  const safeAlertDays = validateNonNegativeNumber(alertDays, 'alertDays');
  return new Date(now.getTime() + safeAlertDays * DAY_MS);
};

export const getExpiringContracts = (
  contracts: Contract[],
  now: Date,
  alertDays: number,
): Contract[] => {
  const futureDate = getContractAlertWindowEnd(now, alertDays);
  return contracts.filter(
    (contract) =>
      contract.status === 'ACTIVE' &&
      new Date(contract.end) <= futureDate &&
      new Date(contract.end) >= now,
  );
};

export const getOverdueContracts = (
  contracts: Contract[],
  balances: ContractBalance[],
  minimumBalance = 0,
): Contract[] => {
  const safeMinimumBalance = validateNonNegativeNumber(minimumBalance, 'minimumBalance');
  const overdueContractIds = new Set(
    balances.filter((balance) => balance.balance > safeMinimumBalance).map((balance) => balance.contractId),
  );
  return contracts.filter((contract) => contract.status === 'ACTIVE' && overdueContractIds.has(contract.id));
};

export const calculateContractStatus = (
  contract: Contract,
  balance: ContractBalance | undefined,
  now: Date,
  alertDays: number,
): ContractStatusSnapshot => {
  const safeAlertDays = validateNonNegativeNumber(alertDays, 'alertDays');
  const daysToExpiry = Math.ceil((new Date(contract.end).getTime() - now.getTime()) / DAY_MS);
  const overdueBalance = balance?.balance ?? 0;

  if (contract.status !== 'ACTIVE') {
    return { contractId: contract.id, status: 'INACTIVE', daysToExpiry, overdueBalance };
  }

  if (overdueBalance > 0) {
    return { contractId: contract.id, status: 'OVERDUE', daysToExpiry, overdueBalance };
  }

  if (daysToExpiry <= safeAlertDays && daysToExpiry >= 0) {
    return { contractId: contract.id, status: 'EXPIRING', daysToExpiry, overdueBalance };
  }

  return { contractId: contract.id, status: 'ACTIVE', daysToExpiry, overdueBalance };
};

export const buildContractStatusSnapshots = (
  db: Pick<Database, 'contracts' | 'contractBalances'>,
  now: Date,
  alertDays: number,
): ContractStatusSnapshot[] => {
  return db.contracts.map((contract) => {
    const balance = db.contractBalances.find((entry) => entry.contractId === contract.id);
    return calculateContractStatus(contract, balance, now, alertDays);
  });
};

export interface ContractStatusSummary {
  active: number;
  expired: number;
  expiringSoon: number;
  draft: number;
  terminated: number;
}

export const getContractsExpiringSoon = (
  contracts: Contract[],
  alertDays: number,
): Contract[] => {
  const now = new Date();
  const windowEnd = getContractAlertWindowEnd(now, alertDays);

  return contracts
    .filter((contract) => {
      if (contract.status !== 'ACTIVE') {
        return false;
      }

      const endDate = new Date(contract.end);
      return endDate >= now && endDate <= windowEnd;
    })
    .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());
};

export const getExpiredContracts = (contracts: Contract[]): Contract[] => {
  const now = new Date();

  return contracts
    .filter((contract) => contract.status === 'ACTIVE' && new Date(contract.end) < now)
    .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());
};

export const getContractStatusSummary = (contracts: Contract[]): ContractStatusSummary => {
  const expiringSoon = getContractsExpiringSoon(contracts, 30).length;
  const expired = getExpiredContracts(contracts).length;

  return contracts.reduce<ContractStatusSummary>(
    (acc, contract) => {
      if (contract.status === 'ACTIVE') {
        acc.active += 1;
      }
      if ((contract.status as string) === 'DRAFT') {
        acc.draft += 1;
      }
      if ((contract.status as string) === 'TERMINATED') {
        acc.terminated += 1;
      }
      if (contract.status === 'ENDED') {
        acc.expired += 1;
      }

      return acc;
    },
    {
      active: 0,
      expired: expired,
      expiringSoon,
      draft: 0,
      terminated: 0,
    },
  );
};
