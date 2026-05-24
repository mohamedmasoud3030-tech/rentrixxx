import { useMutation } from '@tanstack/react-query';
import { requestAiAssistant, type AiAssistantAction } from '@/services/aiAssistantService';

export function useSmartAssistant() {
  return useMutation({
    mutationFn: async (params: { action: AiAssistantAction; prompt: string }) => {
      return requestAiAssistant(params.action, params.prompt);
    },
  });
}
