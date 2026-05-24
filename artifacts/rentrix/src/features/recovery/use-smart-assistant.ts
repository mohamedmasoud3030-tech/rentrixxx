import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { askAssistant } from '@/services/aiAssistantService';

export function useAskAssistant() {
  return useMutation({ mutationFn: (prompt: string) => askAssistant(supabase, prompt) });
}
