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
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;
const EXPORT_PAGE_SIZE = 1000; // Large export pages reduce request count while keeping response payloads bounded.
const EXPORT_MAX_PAGES = 200; // Hard ceiling to keep export reads bounded and avoid runaway loops.
const LIST_BY_IDS_CHUNK_SIZE = 250; // Limits IN-clause size for stable query performance.

function escapePeopleSearchTerm(search: string): string {
  return search.replaceAll('%', String.raw`\%`).replaceAll('_', String.raw`\_`);
}

function applyPeopleFilters<TQuery extends { or: (filters: string) => TQuery; eq: (column: string, value: unknown) => TQuery }>(
  query: TQuery,
  search: string,
  type: PersonTypeFilter,
): TQuery {
  let filteredQuery = query;
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const escaped = escapePeopleSearchTerm(trimmedSearch);
    const term = `"%${escaped}%"`;
    filteredQuery = filteredQuery.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},national_id.ilike.${term}`);
  }
  if (type !== 'all') {
    filteredQuery = filteredQuery.eq('type', type);
  }
  return filteredQuery;
}

export async function listPeople(params: PeopleListParams): Promise<PaginatedPeople> {
  const safePage = Number.isFinite(params.page) ? Math.max(DEFAULT_PAGE, Math.trunc(params.page)) : DEFAULT_PAGE;
  const requestedPageSize = Number.isFinite(params.pageSize) ? Math.trunc(params.pageSize) : DEFAULT_PAGE_SIZE;
  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedPageSize || DEFAULT_PAGE_SIZE));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const query = applyPeopleFilters(
    supabase
    .from('people')
    .select(personColumns, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to),
    params.search,
    params.type,
  );

  const { data, count, error } = await query.returns<Person[]>();
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function listPeopleForExport(search: string, type: PersonTypeFilter): Promise<Person[]> {
  const rows: Person[] = [];
  let page = 0;

  while (page < EXPORT_MAX_PAGES) {
    const from = page * EXPORT_PAGE_SIZE;
    const to = from + EXPORT_PAGE_SIZE - 1;
    const query = applyPeopleFilters(
      supabase
      .from('people')
      .select(personColumns)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
      search,
      type,
    );

    const { data, error } = await query.returns<Person[]>();
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < EXPORT_PAGE_SIZE) {
      return rows;
    }

    page += 1;
  }

  throw new Error(`Export exceeded ${EXPORT_MAX_PAGES * EXPORT_PAGE_SIZE} rows limit. Refine your filters and retry.`);
}

export async function listPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];

  const allRows: Person[] = [];
  for (const chunk of chunkItems(ids, LIST_BY_IDS_CHUNK_SIZE)) {
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
