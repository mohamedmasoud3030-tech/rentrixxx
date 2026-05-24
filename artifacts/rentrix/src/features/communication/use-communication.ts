import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createMessage, createTemplate, listMessages, listRecipients, listTemplates, updateMessageStatus } from '@/services/communicationService';

const keys = { messages: ['communication','messages'] as const, templates: ['communication','templates'] as const, recipients: ['communication','recipients'] as const };

export const useMessages = (filter: {channel?: string; status?: string; search?: string}) => useQuery({ queryKey: [...keys.messages, filter], queryFn: () => listMessages(supabase, filter) });
export const useTemplates = (channel?: string) => useQuery({ queryKey: [...keys.templates, channel ?? 'all'], queryFn: () => listTemplates(supabase, channel) });
export const useRecipients = () => useQuery({ queryKey: keys.recipients, queryFn: () => listRecipients(supabase) });

export function useCreateMessage() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Parameters<typeof createMessage>[1]) => createMessage(supabase, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.messages }) }); }
export function useUpdateMessageStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({id,status,errorMessage}: {id:string;status:'draft'|'queued'|'sent'|'failed';errorMessage?:string|null}) => updateMessageStatus(supabase,id,status,errorMessage), onSuccess: () => qc.invalidateQueries({ queryKey: keys.messages }) }); }
export function useCreateTemplate() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Parameters<typeof createTemplate>[1]) => createTemplate(supabase,payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }) }); }
