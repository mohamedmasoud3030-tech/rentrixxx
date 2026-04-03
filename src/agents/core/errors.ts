export type AgentErrorCode =
  | 'AGENT_EXECUTION_FAILED'
  | 'AGENT_TOOL_VALIDATION_FAILED'
  | 'AGENT_TOOL_EXECUTION_FAILED'
  | 'AGENT_INVALID_RESULT';

export class AgentExecutionError extends Error {
  readonly code: AgentErrorCode;
  readonly causeError?: unknown;

  constructor(code: AgentErrorCode, message: string, causeError?: unknown) {
    super(message);
    this.name = 'AgentExecutionError';
    this.code = code;
    this.causeError = causeError;
  }
}
