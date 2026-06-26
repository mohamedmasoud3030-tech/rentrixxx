import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';

export type Maintenance = Database['public']['Tables']['maintenance_records']['Row'];
export type MaintenanceStatus = Maintenance['status'] | 'all';
export type MaintenancePayload = Database['public']['Tables']['maintenance_records']['Insert'];
export type MaintenanceUpdate = Database['public']['Tables']['maintenance_records']['Update'];
export async function listMaintenance(status: MaintenanceStatus, propertyId: string) {
  let q = supabase.from('maintenance_records').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (status !== 'all' && status != null) q = q.eq('status', status as string);
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q.returns<Maintenance[]>();
  if (error) handleSupabaseError(error, 'تعذر تحميل طلبات الصيانة');
  return data ?? [];
}
export async function createMaintenance(payload: MaintenancePayload) {
  const { data, error } = await supabase.from('maintenance_records').insert(payload).select('*').single().returns<Maintenance>();
  if (error) handleSupabaseError(error, 'تعذر إنشاء طلب الصيانة');
  return data;
}

export async function updateMaintenanceStatus(requestId: string, status: Exclude<MaintenanceStatus, 'all'>) {
  const updatePayload: MaintenanceUpdate = {
    status,
    resolved_at: (status === 'resolved' || status === 'closed') ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updatePayload)
    .eq('id', requestId)
    .is('deleted_at', null)
    .select('*')
    .single()
    .returns<Maintenance>();
  if (error) handleSupabaseError(error, 'تعذر تحديث حالة طلب الصيانة');
  return data;
}
