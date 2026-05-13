import { askAssistant } from '@/services/edgeFunctions';

export async function queryAssistant(_apiKey: string, query: string, context: string): Promise<string> {
  return askAssistant(query, context);
}
