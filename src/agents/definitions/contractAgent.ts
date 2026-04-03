import type { AppNotification, Contract } from '../../types';
import { executeTool } from '../core/toolSystem';
import type { AgentDefinition, ToolExecutionRecord } from '../core/types';
import {
  buildContractStatusSnapshotsTool,
  getExpiringContractsTool,
  getOverdueContractsTool,
  sendNotificationTool,
  type ContractStatusSnapshot,
} from '../tools/contractMonitoringTools';

export type ContractAgentToolName =
  | 'getExpiringContracts'
  | 'getOverdueContracts'
  | 'buildContractStatusSnapshots'
  | 'sendNotification';

export interface ContractMonitoringAgentContext {
  alertDays?: number;
  notify?: boolean;
  minimumOverdueBalance?: number;
}

export interface ContractMonitoringReport {
  generatedAt: number;
  alertDays: number;
  totalActiveContracts: number;
  expiringContracts: Contract[];
  overdueContracts: Contract[];
  inactiveContracts: Contract[];
  statusSnapshots: ContractStatusSnapshot[];
  notifications: AppNotification[];
}

export const contractMonitoringAgent: AgentDefinition<
  ContractMonitoringAgentContext,
  ContractMonitoringReport,
  ContractAgentToolName
> = {
  id: 'contract-monitoring-agent',
  name: 'Contract Monitoring Agent',
  description: 'Orchestrates contract monitoring services and notification workflows.',
  run: async (context, runtime) => {
    const steps: ToolExecutionRecord<ContractAgentToolName>[] = [];
    const alertDays = context.alertDays ?? runtime.settings.operational.contractAlertDays ?? 30;

    const expiringStep = await executeTool(getExpiringContractsTool, { alertDays }, runtime);
    steps.push(expiringStep);

    const overdueStep = await executeTool(
      getOverdueContractsTool,
      { minimumBalance: context.minimumOverdueBalance },
      runtime,
    );
    steps.push(overdueStep);

    const snapshotsStep = await executeTool(buildContractStatusSnapshotsTool, { alertDays }, runtime);
    steps.push(snapshotsStep);

    const notifications: AppNotification[] = [];
    if (context.notify !== false) {
      for (const contract of expiringStep.output) {
        const notifyStep = await executeTool(
          sendNotificationTool,
          {
            type: 'CONTRACT_EXPIRING',
            title: `عقد ينتهي قريباً (${contract.no || contract.id})`,
            message: `العقد ${contract.no || contract.id} سينتهي بتاريخ ${contract.end}.`,
            link: `/contracts?contractId=${contract.id}`,
          },
          runtime,
        );
        steps.push(notifyStep);
        notifications.push(notifyStep.output);
      }

      for (const contract of overdueStep.output) {
        const notifyStep = await executeTool(
          sendNotificationTool,
          {
            type: 'OVERDUE_BALANCE',
            title: `رصيد متأخر للعقد (${contract.no || contract.id})`,
            message: `العقد ${contract.no || contract.id} لديه رصيد متأخر ويحتاج متابعة.`,
            link: `/contracts?contractId=${contract.id}`,
          },
          runtime,
        );
        steps.push(notifyStep);
        notifications.push(notifyStep.output);
      }
    }

    return {
      steps,
      result: {
        generatedAt: Date.now(),
        alertDays,
        totalActiveContracts: runtime.db.contracts.filter((contract) => contract.status === 'ACTIVE').length,
        expiringContracts: expiringStep.output,
        overdueContracts: overdueStep.output,
        inactiveContracts: runtime.db.contracts.filter((contract) => contract.status !== 'ACTIVE'),
        statusSnapshots: snapshotsStep.output,
        notifications,
      },
    };
  },
};
