import type { AppNotification, Contract } from '../../types';
import {
  buildContractStatusSnapshots,
  calculateContractStatus,
  getExpiringContracts,
  getOverdueContracts,
  type ContractStatusSnapshot,
} from '../../services/contractMonitoringService';
import { notificationService } from '../../services/notificationService';
import { validateNonNegativeNumber, validateRequiredString } from '../../utils/validation';
import { createTool } from '../core/toolSystem';

export type { ContractStatusSnapshot } from '../../services/contractMonitoringService';

export interface ExpiringContractsToolInput {
  alertDays: number;
}

export const getExpiringContractsTool = createTool({
  name: 'getExpiringContracts',
  description: 'Gets active contracts expiring inside the configured alert window.',
  validate: (input: ExpiringContractsToolInput): ExpiringContractsToolInput => ({
    alertDays: validateNonNegativeNumber(input.alertDays, 'alertDays'),
  }),
  execute: async (input, context): Promise<Contract[]> => {
    return getExpiringContracts(context.db.contracts, context.now, input.alertDays);
  },
});

export interface OverdueContractsToolInput {
  minimumBalance?: number;
}

export const getOverdueContractsTool = createTool({
  name: 'getOverdueContracts',
  description: 'Gets active contracts that have overdue balances.',
  validate: (input: OverdueContractsToolInput): Required<OverdueContractsToolInput> => ({
    minimumBalance: validateNonNegativeNumber(input.minimumBalance ?? 0, 'minimumBalance'),
  }),
  execute: async (input, context): Promise<Contract[]> => {
    return getOverdueContracts(context.db.contracts, context.db.contractBalances, input.minimumBalance);
  },
});

export interface CalculateContractStatusToolInput {
  contract: Contract;
  alertDays: number;
}

export const calculateContractStatusTool = createTool({
  name: 'calculateContractStatus',
  description: 'Calculates health status for one contract from domain service logic.',
  validate: (input: CalculateContractStatusToolInput): CalculateContractStatusToolInput => ({
    contract: input.contract,
    alertDays: validateNonNegativeNumber(input.alertDays, 'alertDays'),
  }),
  execute: async (input, context): Promise<ContractStatusSnapshot> => {
    const balance = context.db.contractBalances.find((entry) => entry.contractId === input.contract.id);
    return calculateContractStatus(input.contract, balance, context.now, input.alertDays);
  },
});

export interface SendNotificationToolInput {
  type: AppNotification['type'];
  title: string;
  message: string;
  link: string;
}

export const sendNotificationTool = createTool({
  name: 'sendNotification',
  description: 'Sends application notification through notification service abstraction.',
  validate: (input: SendNotificationToolInput): SendNotificationToolInput => ({
    type: input.type,
    title: validateRequiredString(input.title, 'Notification title'),
    message: validateRequiredString(input.message, 'Notification message'),
    link: validateRequiredString(input.link, 'Notification link'),
  }),
  execute: async (input): Promise<AppNotification> => {
    return notificationService.createAppNotification(input);
  },
});

export const buildContractStatusSnapshotsTool = createTool({
  name: 'buildContractStatusSnapshots',
  description: 'Builds status snapshots for all contracts using domain service logic.',
  validate: (input: { alertDays: number }): { alertDays: number } => ({
    alertDays: validateNonNegativeNumber(input.alertDays, 'alertDays'),
  }),
  execute: async (input, context): Promise<ContractStatusSnapshot[]> => {
    return buildContractStatusSnapshots(context.db, context.now, input.alertDays);
  },
});
