import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type LandRow = Database['public']['Tables']['lands']['Row'];
type LandInsert = Database['public']['Tables']['lands']['Insert'];

export type Land = LandRow;
export type LandOwnershipStatus = LandRow['ownership_status'];
export type LandStatus = LandRow['status'];

function sanitizePostgrestSearch(value: string) {
  return value.trim().replace(/[%,]/g, ' ');
}

function validateLandPayload(payload: LandInsert) {
  if (!payload.title?.trim()) throw new Error('اسم الأرض مطلوب');
  if (payload.area !== null && payload.area !== undefined && payload.area < 0) throw new Error('المساحة لا يمكن أن تكون سالبة');
  if (payload.value_amount !== null && payload.value_amount !== undefined && payload.value_amount < 0) throw new Error('القيمة لا يمكن أن تكون سالبة');
  if (payload.latitude !== null && payload.latitude !== undefined && (payload.latitude < -90 || payload.latitude > 90)) throw new Error('خط العرض يجب أن يكون بين -90 و90');
  if (payload.longitude !== null && payload.longitude !== undefined && (payload.longitude < -180 || payload.longitude > 180)) throw new Error('خط الطول يجب أن يكون بين -180 و180');
}

export async function listLands(supabase: SupabaseClient, search = ''): Promise<Land[]> {
  let query = supabase.from('lands').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  const term = sanitizePostgrestSearch(search);
  if (term) query = query.or(`title.ilike.%${term}%,address.ilike.%${term}%,city.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Land[];
}

export async function createLand(supabase: SupabaseClient, payload: LandInsert) {
  validateLandPayload(payload);
  const { data, error } = await supabase.from('lands').insert(payload).select('*').single();
  if (error) throw error;
  return data as Land;
}

export async function updateLand(supabase: SupabaseClient, id: string, payload: Partial<LandInsert>) {
  const { data, error } = await supabase.from('lands').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Land;
}

export async function archiveLand(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('lands').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Land;
}
