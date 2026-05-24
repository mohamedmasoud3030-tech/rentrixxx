import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { Person } from '@/types/domain';
import type { PersonPayload } from './person-schema';
import { chunkItems } from '@/lib/chunk';

export type PersonTypeFilter = Person['type'] | 'all';

export type PeopleListParams = {
  search: string;
  type: PersonTypeFilter;
  page: number;
  pageSize: number;
};

export type PaginatedPeople = {
  rows: Person[];
  count: number;
};

type PersonInsert = Database['public']['Tables']['people']['Insert'];
type PersonUpdate = Database['public']['Tables']['people']['Update'];

const personColumns = 'id,full_name,phone,email,national_id,type,address,notes,created_at,updated_at,deleted_at';
const exportPageSize = 1000;
const maxExportPages = 200;

export async function listPeople(params: PeopleListParams): Promise<PaginatedPeople> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from('people')
    .select(personColumns, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);

  const trimmedSearch = params.search.trim();
  if (trimmedSearch) {
    const escaped = trimmedSearch.replaceAll('%', String.raw`\%`).replaceAll('_', String.raw`\_`);
    const term = `"%${escaped}%"`;
    query = query.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},national_id.ilike.${term}`);
  }

  if (params.type !== 'all') {
    query = query.eq('type', params.type);
  }

  const { data, count, error } = await query.returns<Person[]>();
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function listPeopleForExport(search: string, type: PersonTypeFilter): Promise<Person[]> {
  const rows: Person[] = [];
  let page = 0;

  while (page < maxExportPages) {
    const from = page * exportPageSize;
    const to = from + exportPageSize - 1;
    let query = supabase
      .from('people')
      .select(personColumns)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const escaped = trimmedSearch.replaceAll('%', String.raw`\%`).replaceAll('_', String.raw`\_`);
      const term = `"%${escaped}%"`;
      query = query.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},national_id.ilike.${term}`);
    }

    if (type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query.returns<Person[]>();
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < exportPageSize) {
      return rows;
    }

    page += 1;
  }

  throw new Error(`Export exceeded ${maxExportPages * exportPageSize} rows limit. Refine your filters and retry.`);
}

export async function listPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];

  const allRows: Person[] = [];
  for (const chunk of chunkItems(ids, 250)) {
    const { data, error } = await supabase
      .from('people')
      .select(personColumns)
      .in('id', chunk)
      .is('deleted_at', null)
      .returns<Person[]>();
    if (error) throw error;
    allRows.push(...(data ?? []));
  }

  return allRows;
}

export async function getPerson(personId: string): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .select(personColumns)
    .eq('id', personId)
    .is('deleted_at', null)
    .single()
    .returns<Person>();
  if (error) throw error;
  return data;
}

export async function createPerson(payload: PersonPayload): Promise<Person> {
  const insertPayload: PersonInsert = payload;
  const { data, error } = await supabase.from('people').insert(insertPayload).select(personColumns).single().returns<Person>();
  if (error) throw error;
  return data;
}

export async function updatePerson(personId: string, payload: PersonPayload): Promise<Person> {
  const updatePayload: PersonUpdate = payload;
  const { data, error } = await supabase
    .from('people')
    .update(updatePayload)
    .eq('id', personId)
    .is('deleted_at', null)
    .select(personColumns)
    .single()
    .returns<Person>();
  if (error) throw error;
  return data;
}

export async function softDeletePerson(personId: string): Promise<void> {
  const updatePayload: PersonUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('people').update(updatePayload).eq('id', personId).is('deleted_at', null);
  if (error) throw error;
}
