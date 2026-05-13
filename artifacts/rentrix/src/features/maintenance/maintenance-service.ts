import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';
export type Maintenance = Database['public']['Tables']['maintenance_requests']['Row'];
export type MaintenanceStatus = Maintenance['status'] | 'all';
export type MaintenancePayload = Database['public']['Tables']['maintenance_requests']['Insert'];
export async function listMaintenance(status: MaintenanceStatus, propertyId: string) {
  try {
    let q = supabase.from('maintenance_requests').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
    if (propertyId) q = q.eq('property_id', propertyId);
    const { data, error } = await q.returns<Maintenance[]>();
    if (error) handleSupabaseError(error);
    return data ?? [];
  } catch (error) {
    handleSupabaseError(error, 'تعذر تحميل طلبات الصيانة');
    return [];
  }
}
export async function createMaintenance(payload: MaintenancePayload) {
  try {
    const { data, error } = await supabase.from('maintenance_requests').insert(payload).select('*').single().returns<Maintenance>();
    if (error) handleSupabaseError(error);
    return data;
  } catch (error) {
    handleSupabaseError(error, 'تعذر إنشاء طلب الصيانة');
    return null as never;
  }
}
