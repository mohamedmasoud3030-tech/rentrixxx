export interface AIRuntimeContext {
  scope: string;
  prompt: string;
  payload: unknown;
}

export function buildContext(prompt: string, payload: unknown, scope = 'default'): AIRuntimeContext {
  return {
    scope,
    prompt,
    payload,
  };
}
