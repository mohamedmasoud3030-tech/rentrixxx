import { logger } from '../../services/logger';
import { AgentExecutionError } from './errors';
import type { AgentTool, AgentToolContext, ToolExecutionRecord } from './types';

export const executeTool = async <
  TName extends string,
  TInput,
  TOutput,
>(
  tool: AgentTool<TName, TInput, TOutput>,
  input: TInput,
  context: AgentToolContext,
): Promise<ToolExecutionRecord<TName, TOutput>> => {
  const startedAt = Date.now();

  let safeInput: TInput;
  try {
    safeInput = tool.validate(input);
  } catch (error) {
    throw new AgentExecutionError(
      'AGENT_TOOL_VALIDATION_FAILED',
      `Tool validation failed: ${tool.name}`,
      error,
    );
  }

  logger.debug(`[AgentTool:${tool.name}] started`, { input: safeInput });

  try {
    const output = await tool.execute(safeInput, context);
    const endedAt = Date.now();

    return {
      toolName: tool.name,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      output,
    };
  } catch (error) {
    throw new AgentExecutionError(
      'AGENT_TOOL_EXECUTION_FAILED',
      `Tool execution failed: ${tool.name}`,
      error,
    );
  }
};

export const createTool = <TName extends string, TInput, TOutput>(
  tool: AgentTool<TName, TInput, TOutput>,
): AgentTool<TName, TInput, TOutput> => tool;
