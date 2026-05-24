import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ownerKeys } from './useOwners';
import { createOwnerAgreement, getOwnerAgreement, listOwnerAgreements, terminateOwnerAgreement, updateOwnerAgreement } from './ownerAgreementService';

export const ownerAgreementKeys = { all: ['owner-agreements'] as const, detail: (id: string) => ['owner-agreements', 'detail', id] as const, byOwner: (id: string) => ['owner-agreements', 'owner', id] as const };

export function useOwnerAgreements(ownerId?: string) { return useQuery({ queryKey: ownerId ? ownerAgreementKeys.byOwner(ownerId) : ownerAgreementKeys.all, queryFn: () => listOwnerAgreements(ownerId ? { ownerId } : undefined) }); }
export function useOwnerAgreement(id: string) { return useQuery({ queryKey: ownerAgreementKeys.detail(id), queryFn: () => getOwnerAgreement(id), enabled: Boolean(id) }); }
export function useCreateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: createOwnerAgreement, onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }), qc.invalidateQueries({ queryKey: ownerKeys.all })]); toast.success('تم إنشاء اتفاقية الإدارة'); } }); }
export function useUpdateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateOwnerAgreement(id, input), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }); toast.success('تم تحديث اتفاقية الإدارة'); } }); }
export function useTerminateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, endsOn }: { id: string; endsOn: string }) => terminateOwnerAgreement(id, endsOn), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }); toast.success('تم إنهاء الاتفاقية'); } }); }
