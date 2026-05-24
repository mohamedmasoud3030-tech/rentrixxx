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

const exportPageSize = 500;
const maxExportPages = 20;

function escapePropertySearch(search: string): string {
  return search.replaceAll(/[%_]/g, (character) => (character === '%' ? String.raw`\%` : String.raw`\_`));
}

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
    const escaped = escapePropertySearch(trimmedSearch);
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

export async function listPropertiesForExport(search: string, status: PropertyStatusFilter): Promise<Property[]> {
  const rows: Property[] = [];
  const trimmedSearch = search.trim();
  for (let pageIndex = 0; pageIndex < maxExportPages; pageIndex += 1) {
    const from = pageIndex * exportPageSize;
    const to = from + exportPageSize - 1;
    let query = supabase
      .from('properties')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (trimmedSearch) {
      const escaped = escapePropertySearch(trimmedSearch);
      const term = `"%${escaped}%"`;
      query = query.or(`title.ilike.${term},address.ilike.${term},owner_name.ilike.${term}`);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.returns<Property[]>();
    if (error) throw error;
    const pageRows = data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < exportPageSize) return rows;
  }
  throw new Error('نتائج التصدير كبيرة جداً. يرجى تضييق البحث أو الحالة ثم إعادة المحاولة.');
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
  const insertPayload: PropertyInsert = payload;
  const { data, error } = await supabase.from('properties').insert(insertPayload).select('*').single().returns<Property>();
  if (error) throw error;
  return data;
}

export async function updateProperty(propertyId: string, payload: PropertyPayload): Promise<Property> {
  const updatePayload: PropertyUpdate = payload;
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
