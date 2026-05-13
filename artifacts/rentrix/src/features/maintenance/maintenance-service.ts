import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';

export type Maintenance = Database['public']['Tables']['maintenance_requests']['Row'];
export type MaintenanceStatus = Maintenance['status'] | 'all';
export type MaintenancePayload = Database['public']['Tables']['maintenance_requests']['Insert'];

export async function listMaintenance(status: MaintenanceStatus, propertyFilterId: string) {
  try {
    let q = supabase.from('maintenance_requests').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
    if (propertyFilterId) q = q.eq('property_id', propertyFilterId);
    const { data, error } = await q.returns<Maintenance[]>();
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    handleSupabaseError(err, 'تعذر تحميل طلبات الصيانة');
  }
}

export async function createMaintenance(payload: MaintenancePayload) {
  try {
    const { data, error } = await supabase.from('maintenance_requests').insert(payload).select('*').single().returns<Maintenance>();
    if (error) throw error;
    return data;
  } catch (err) {
    handleSupabaseError(err, 'تعذر إنشاء طلب الصيانة');
  }
}
