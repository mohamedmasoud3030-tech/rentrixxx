import { runAgent } from '../core/agentRunner';
import type { AgentRunContext, AgentRunResult } from '../core/types';
import {
  contractMonitoringAgent,
  type ContractMonitoringAgentContext,
  type ContractMonitoringReport,
} from '../definitions/contractAgent';

export interface ContractMonitoringWorkflowInput extends ContractMonitoringAgentContext {
  handoffToFinancialAgent?: boolean;
}

export interface ContractMonitoringWorkflowResult {
  contractRun: AgentRunResult<ContractMonitoringReport>;
  handoff: {
    targetAgentId: 'financial-agent' | null;
    reason: string | null;
  };
}

export const runContractMonitoringWorkflow = async (
  input: ContractMonitoringWorkflowInput,
  runtimeContext: AgentRunContext,
): Promise<ContractMonitoringWorkflowResult> => {
  const contractRun = await runAgent(contractMonitoringAgent, input, runtimeContext);

  if (contractRun.status === 'failed' || !contractRun.result) {
    return {
      contractRun,
      handoff: {
        targetAgentId: null,
        reason: `Skipped handoff because contract agent failed: ${contractRun.error?.message || 'unknown error'}`,
      },
    };
  }

  const shouldHandoff = input.handoffToFinancialAgent === true && contractRun.result.overdueContracts.length > 0;

  return {
    contractRun,
    handoff: shouldHandoff
      ? {
          targetAgentId: 'financial-agent',
          reason: `Detected ${contractRun.result.overdueContracts.length} overdue contracts`,
        }
      : {
          targetAgentId: null,
          reason: null,
        },
  };
};
