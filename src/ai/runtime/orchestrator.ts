import { askAssistant } from '@/services/edgeFunctions';
import type { AIRuntimeContext } from '@/ai/runtime/contextBuilder';

const AI_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timeout.')), AI_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]);
};

export async function runAI(context: AIRuntimeContext): Promise<string> {
  if (!context || typeof context.prompt !== 'string' || !context.prompt.trim()) {
    throw new Error('AI prompt is required.');
  }

  const safePayload = context.payload ?? {};
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= MAX_RETRIES) {
    try {
      return await withTimeout(askAssistant(context.prompt.trim(), safePayload));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('AI request failed.');
      attempt += 1;
      if (attempt > MAX_RETRIES) break;
    }
  }

  throw lastError ?? new Error('AI request failed.');
}
