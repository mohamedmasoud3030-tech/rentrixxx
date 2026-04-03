import type { Database, Settings } from '../../types';
import type { AgentErrorCode } from './errors';

export type AgentRunStatus = 'success' | 'failed';

export interface AgentToolContext {
  db: Database;
  settings: Settings;
  now: Date;
}

export interface ToolExecutionRecord<TName extends string = string, TOutput = unknown> {
  toolName: TName;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  output: TOutput;
}

export interface AgentTool<TName extends string, TInput, TOutput> {
  name: TName;
  description: string;
  validate: (input: TInput) => TInput;
  execute: (input: TInput, context: AgentToolContext) => Promise<TOutput>;
}

export interface AgentRunContext {
  db: Database;
  settings: Settings;
  now?: Date;
}

export interface AgentRunError {
  code: AgentErrorCode;
  message: string;
}

export interface AgentRunResult<TResult, TToolName extends string = string> {
  agentId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  status: AgentRunStatus;
  result: TResult | null;
  error: AgentRunError | null;
  steps: ToolExecutionRecord<TToolName>[];
}

export interface AgentDefinition<
  TAgentContext,
  TResult,
  TToolName extends string = string,
> {
  id: string;
  name: string;
  description: string;
  run: (
    context: TAgentContext,
    runtime: AgentToolContext,
  ) => Promise<{
    result: TResult;
    steps: ToolExecutionRecord<TToolName>[];
  }>;
}
