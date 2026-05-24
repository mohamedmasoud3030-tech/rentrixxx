import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { propertyKeys } from '@/features/properties/use-properties';
import { ownerKeys } from './useOwners';
import { createOwnerAgreement, getOwnerAgreement, listOwnerAgreements, terminateOwnerAgreement, updateOwnerAgreement } from './ownerAgreementService';
import type { OwnerAgreementStatus } from './ownerAgreementTypes';

export const ownerAgreementKeys = { all: ['owner-agreements'] as const, detail: (id: string) => ['owner-agreements', 'detail', id] as const, byOwner: (id: string) => ['owner-agreements', 'owner', id] as const, byProperty: (id: string) => ['owner-agreements', 'property', id] as const, list: (ownerId?: string, propertyId?: string, status?: OwnerAgreementStatus) => ['owner-agreements', 'list', ownerId ?? '', propertyId ?? '', status ?? ''] as const };

export function useOwnerAgreements(params?: { ownerId?: string; propertyId?: string; status?: OwnerAgreementStatus }) {
  return useQuery({ queryKey: ownerAgreementKeys.list(params?.ownerId, params?.propertyId, params?.status), queryFn: () => listOwnerAgreements(params) });
}
export function useOwnerAgreement(id: string) { return useQuery({ queryKey: ownerAgreementKeys.detail(id), queryFn: () => getOwnerAgreement(id), enabled: Boolean(id) }); }
export function useCreateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: createOwnerAgreement, onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }), qc.invalidateQueries({ queryKey: ownerKeys.all }), qc.invalidateQueries({ queryKey: propertyKeys.all })]); toast.success('تم إنشاء اتفاقية الإدارة'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إنشاء اتفاقية الإدارة') }); }
export function useUpdateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateOwnerAgreement>[1] }) => updateOwnerAgreement(id, input), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }), qc.invalidateQueries({ queryKey: ownerKeys.all }), qc.invalidateQueries({ queryKey: propertyKeys.all })]); toast.success('تم تحديث اتفاقية الإدارة'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تحديث اتفاقية الإدارة') }); }
export function useTerminateOwnerAgreement() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, endsOn }: { id: string; endsOn: string }) => terminateOwnerAgreement(id, endsOn), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ownerAgreementKeys.all }), qc.invalidateQueries({ queryKey: ownerKeys.all }), qc.invalidateQueries({ queryKey: propertyKeys.all })]); toast.success('تم إنهاء الاتفاقية'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إنهاء اتفاقية الإدارة') }); }
