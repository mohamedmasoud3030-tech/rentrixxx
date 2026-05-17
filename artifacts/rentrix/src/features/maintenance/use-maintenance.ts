import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createMaintenance, listMaintenance, updateMaintenanceStatus, type MaintenancePayload, type MaintenanceStatus } from './maintenance-service';
export const maintenanceKeys = { all: ['maintenance'] as const, list: (s: MaintenanceStatus, p: string) => [...maintenanceKeys.all, s, p] as const };
export function useMaintenance(status: MaintenanceStatus, propertyId: string) { return useQuery({ queryKey: maintenanceKeys.list(status, propertyId), queryFn: () => listMaintenance(status, propertyId) }); }
export function useCreateMaintenance() { const qc = useQueryClient(); return useMutation({ mutationFn: (p: MaintenancePayload) => createMaintenance(p), onSuccess: async () => { await qc.invalidateQueries({ queryKey: maintenanceKeys.all }); toast.success('تم حفظ طلب الصيانة'); } }); }

export function useUpdateMaintenanceStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ requestId, status }: { requestId: string; status: Exclude<MaintenanceStatus, 'all'> }) => updateMaintenanceStatus(requestId, status), onSuccess: async () => { await qc.invalidateQueries({ queryKey: maintenanceKeys.all }); toast.success('تم تحديث حالة طلب الصيانة'); }, onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة طلب الصيانة') }); }
