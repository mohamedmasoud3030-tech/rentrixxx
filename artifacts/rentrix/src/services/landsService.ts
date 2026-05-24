import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type LandInsert = Database['public']['Tables']['lands']['Insert'];

export async function listLands(supabase: SupabaseClient, search = '') {
  let query = supabase.from('lands').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (search.trim()) query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createLand(supabase: SupabaseClient, payload: LandInsert) {
  const { data, error } = await supabase.from('lands').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateLand(supabase: SupabaseClient, id: string, payload: Partial<LandInsert>) {
  const { data, error } = await supabase.from('lands').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function archiveLand(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('lands').update({ status: 'archived', deleted_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
