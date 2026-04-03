import type { Database, Settings } from '../../types';
import type { ContractMonitoringWorkflowInput } from './contractMonitoringWorkflow';
import { runContractMonitoringWorkflow } from './contractMonitoringWorkflow';

const AGENT_JOB_HISTORY_KEY = 'rentrix_agent_job_history';
const MAX_HISTORY_SIZE = 100;

export type AgentJobTrigger = 'manual' | 'scheduled';

export interface AgentJobRecord {
  id: string;
  agentId: 'contract-monitoring-agent';
  trigger: AgentJobTrigger;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  status: 'success' | 'failed';
  errorMessage: string | null;
}

export interface AgentRuntimeSource {
  getRuntime: () => { db: Database; settings: Settings; now?: Date };
}

export interface ContractMonitoringScheduleConfig {
  intervalMs: number;
  workflowInput?: ContractMonitoringWorkflowInput;
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const loadJobHistory = (): AgentJobRecord[] => {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(AGENT_JOB_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as AgentJobRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveJobHistory = (records: AgentJobRecord[]): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(AGENT_JOB_HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY_SIZE)));
};

const appendJobRecord = (record: AgentJobRecord): void => {
  const next = [record, ...loadJobHistory()];
  saveJobHistory(next);
};

const buildRecord = (
  trigger: AgentJobTrigger,
  startedAt: number,
  endedAt: number,
  status: 'success' | 'failed',
  errorMessage: string | null,
): AgentJobRecord => ({
  id: crypto.randomUUID(),
  agentId: 'contract-monitoring-agent',
  trigger,
  startedAt,
  endedAt,
  durationMs: endedAt - startedAt,
  status,
  errorMessage,
});

export const runContractMonitoringJob = async (
  runtimeSource: AgentRuntimeSource,
  trigger: AgentJobTrigger,
  workflowInput?: ContractMonitoringWorkflowInput,
): Promise<AgentJobRecord> => {
  const startedAt = Date.now();
  const runtime = runtimeSource.getRuntime();

  const result = await runContractMonitoringWorkflow(
    workflowInput ?? { notify: true, handoffToFinancialAgent: true },
    runtime,
  );

  const endedAt = Date.now();
  const record = buildRecord(
    trigger,
    startedAt,
    endedAt,
    result.contractRun.status,
    result.contractRun.error?.message ?? null,
  );

  appendJobRecord(record);
  return record;
};

export const triggerContractMonitoringManuallyWithHistory = async (
  runtimeSource: AgentRuntimeSource,
  workflowInput?: ContractMonitoringWorkflowInput,
): Promise<AgentJobRecord> => {
  return runContractMonitoringJob(runtimeSource, 'manual', workflowInput);
};

export const getAgentJobHistory = (): AgentJobRecord[] => loadJobHistory();

export interface AgentScheduleController {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export const createContractMonitoringScheduler = (
  runtimeSource: AgentRuntimeSource,
  config: ContractMonitoringScheduleConfig,
): AgentScheduleController => {
  let timerId: ReturnType<typeof setInterval> | null = null;

  const runScheduled = () => {
    void runContractMonitoringJob(runtimeSource, 'scheduled', config.workflowInput);
  };

  return {
    start: () => {
      if (timerId) return;
      runScheduled();
      timerId = setInterval(runScheduled, config.intervalMs);
    },
    stop: () => {
      if (!timerId) return;
      clearInterval(timerId);
      timerId = null;
    },
    isRunning: () => timerId !== null,
  };
};
