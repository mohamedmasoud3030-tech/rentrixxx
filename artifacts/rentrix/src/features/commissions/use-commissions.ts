import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createCommission, createCommissionRule, listCommissionRules, listCommissions, updateCommissionRule, updateCommissionStatus } from '@/services/commissionsService';

const keys = { rules: ['commissions', 'rules'] as const, rows: ['commissions', 'rows'] as const };

export const useCommissionRules = () => useQuery({ queryKey: keys.rules, queryFn: () => listCommissionRules(supabase) });
export const useCommissions = () => useQuery({ queryKey: keys.rows, queryFn: () => listCommissions(supabase) });

export function useCreateRule() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Parameters<typeof createCommissionRule>[1]) => createCommissionRule(supabase, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.rules }) }); }
export function useUpdateRule() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCommissionRule>[2] }) => updateCommissionRule(supabase, id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.rules }) }); }
export function useCreateCommission() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Parameters<typeof createCommission>[1]) => createCommission(supabase, payload), onSuccess: () => qc.invalidateQueries({ queryKey: keys.rows }) }); }
export function useUpdateCommissionStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, status }: { id: string; status: 'pending' | 'approved' | 'paid' | 'cancelled' }) => updateCommissionStatus(supabase, id, status), onSuccess: () => qc.invalidateQueries({ queryKey: keys.rows }) }); }
