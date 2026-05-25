import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createLead, listLeads, updateLead, type LeadInsert, type LeadUpdate } from './leads-service';

const leadsKeys = {
  all: ['leads'] as const,
};

export function useLeads() {
  return useQuery({ queryKey: leadsKeys.all, queryFn: listLeads });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeadInsert) => createLead(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success('تمت إضافة العميل المحتمل');
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: LeadUpdate }) => updateLead(leadId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leadsKeys.all });
      toast.success('تم تحديث العميل المحتمل');
    },
  });
}
