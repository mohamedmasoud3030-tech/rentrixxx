import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { Property } from '@/types/domain';
import type { PropertyPayload } from './property-schema';

export type PropertyStatusFilter = Property['status'] | 'all';

export type PropertyListParams = {
  search: string;
  status: PropertyStatusFilter;
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  rows: T[];
  count: number;
};

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export async function listProperties(params: PropertyListParams): Promise<PaginatedResult<Property>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  const trimmedSearch = params.search.trim();
  if (trimmedSearch) {
    const escaped = trimmedSearch.replaceAll('%', '\\%').replaceAll('_', '\\_');
    const term = `"%${escaped}%"`;
    query = query.or(`title.ilike.${term},address.ilike.${term},owner_name.ilike.${term}`);
  }

  if (params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data, count, error } = await query.returns<Property[]>();
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function getProperty(propertyId: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .is('deleted_at', null)
    .single()
    .returns<Property>();
  if (error) throw error;
  return data;
}

export async function createProperty(payload: PropertyPayload): Promise<Property> {
  const insertPayload: any = {
    ...payload,
    // Database 'name' field maps from 'title'
    name: payload.title || '',
  };
  const { data, error } = await supabase.from('properties').insert(insertPayload).select('*').single().returns<Property>();
  if (error) throw error;
  return data;
}

export async function updateProperty(propertyId: string, payload: PropertyPayload): Promise<Property> {
  const updatePayload: any = {
    ...payload,
    // Database 'name' field maps from 'title'
    name: payload.title || '',
  };
  const { data, error } = await supabase
    .from('properties')
    .update(updatePayload)
    .eq('id', propertyId)
    .is('deleted_at', null)
    .select('*')
    .single()
    .returns<Property>();
  if (error) throw error;
  return data;
}

export async function softDeleteProperty(propertyId: string): Promise<void> {
  const updatePayload: PropertyUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('properties').update(updatePayload).eq('id', propertyId).is('deleted_at', null);
  if (error) throw error;
}
