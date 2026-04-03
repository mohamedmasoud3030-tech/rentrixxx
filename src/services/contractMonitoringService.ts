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
