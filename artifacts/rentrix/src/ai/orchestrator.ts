import { queryAssistant } from '@/services/geminiService';

const AI_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

export type AIInput = {
  query: string;
  context?: unknown;
};

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timeout.')), AI_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]);
};

export async function runAI(input: AIInput): Promise<string> {
  if (!input || typeof input.query !== 'string' || !input.query.trim()) {
    throw new Error('AI input.query is required.');
  }

  const context = typeof input.context === 'string' ? input.context : JSON.stringify(input.context ?? {});

  let attempt = 0;
  let lastError: Error | null = null;
  while (attempt <= MAX_RETRIES) {
    try {
      return await withTimeout(queryAssistant('', input.query.trim(), context));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('AI request failed.');
      attempt += 1;
      if (attempt > MAX_RETRIES) break;
    }
  }

  throw lastError ?? new Error('AI request failed.');
}
