import { logger } from '../../services/logger';
import { AgentExecutionError } from './errors';
import type { AgentDefinition, AgentRunContext, AgentRunResult, AgentToolContext } from './types';

const toAgentError = (error: unknown): AgentRunResult<never>['error'] => {
  if (error instanceof AgentExecutionError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'AGENT_EXECUTION_FAILED',
      message: error.message,
    };
  }

  return {
    code: 'AGENT_EXECUTION_FAILED',
    message: 'Unknown agent execution error',
  };
};

export const runAgent = async <TAgentContext, TResult, TToolName extends string = string>(
  agent: AgentDefinition<TAgentContext, TResult, TToolName>,
  context: TAgentContext,
  runtimeContext: AgentRunContext,
): Promise<AgentRunResult<TResult, TToolName>> => {
  const startedAt = Date.now();
  logger.info(`[AgentRunner] Starting agent: ${agent.id}`);

  const runtime: AgentToolContext = {
    db: runtimeContext.db,
    settings: runtimeContext.settings,
    now: runtimeContext.now ?? new Date(),
  };

  try {
    const runOutput = await agent.run(context, runtime);
    const endedAt = Date.now();

    return {
      agentId: agent.id,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      status: 'success',
      result: runOutput.result,
      error: null,
      steps: runOutput.steps,
    };
  } catch (error) {
    const endedAt = Date.now();
    const normalizedError = toAgentError(error);

    logger.error(`[AgentRunner] Agent failed: ${agent.id}`, {
      error: normalizedError,
      raw: error,
    });

    return {
      agentId: agent.id,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      status: 'failed',
      result: null,
      error: normalizedError,
      steps: [],
    };
  }
};
