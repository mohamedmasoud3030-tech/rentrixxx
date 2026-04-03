import type { Database, Settings } from '../../types';
import { runContractMonitoringWorkflow, type ContractMonitoringWorkflowResult } from './contractMonitoringWorkflow';

export interface AgentRuntimeInput {
  db: Database;
  settings: Settings;
}

export const triggerContractMonitoringManually = async (
  runtime: AgentRuntimeInput,
): Promise<ContractMonitoringWorkflowResult> => {
  return runContractMonitoringWorkflow(
    {
      notify: true,
      handoffToFinancialAgent: true,
    },
    {
      db: runtime.db,
      settings: runtime.settings,
      now: new Date(),
    },
  );
};

export const triggerContractMonitoringFromScheduler = async (
  runtime: AgentRuntimeInput,
  executionDate: Date,
): Promise<ContractMonitoringWorkflowResult> => {
  return runContractMonitoringWorkflow(
    {
      notify: true,
      handoffToFinancialAgent: true,
    },
    {
      db: runtime.db,
      settings: runtime.settings,
      now: executionDate,
    },
  );
};

export interface ContractMonitoringConsumptionModel {
  dashboard: {
    expiringCount: number;
    overdueCount: number;
    inactiveCount: number;
  };
  reports: {
    generatedAt: number;
    alertDays: number;
    notificationsCount: number;
    status: 'success' | 'failed';
    errorMessage: string | null;
  };
  notifications: {
    createdIds: string[];
  };
}

export const buildContractMonitoringConsumption = (
  workflow: ContractMonitoringWorkflowResult,
): ContractMonitoringConsumptionModel => {
  const report = workflow.contractRun.result;

  return {
    dashboard: {
      expiringCount: report?.expiringContracts.length ?? 0,
      overdueCount: report?.overdueContracts.length ?? 0,
      inactiveCount: report?.inactiveContracts.length ?? 0,
    },
    reports: {
      generatedAt: report?.generatedAt ?? workflow.contractRun.endedAt,
      alertDays: report?.alertDays ?? 0,
      notificationsCount: report?.notifications.length ?? 0,
      status: workflow.contractRun.status,
      errorMessage: workflow.contractRun.error?.message ?? null,
    },
    notifications: {
      createdIds: report?.notifications.map((notification) => notification.id) ?? [],
    },
  };
};
