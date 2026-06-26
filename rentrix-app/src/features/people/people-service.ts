import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';
import type { Person } from '@/types/domain';
import type { PersonPayload } from './person-schema';

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

const nullablePersonStringFields = ['phone', 'email', 'national_id', 'address', 'notes'] as const;

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function normalizeRequiredString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizePersonPayload(payload: PersonPayload): PersonInsert {
  const fullName = normalizeRequiredString(payload.full_name);
  if (!fullName) throw new Error('الاسم الكامل مطلوب');

  const normalized: PersonInsert = {
    full_name: fullName,
    type: payload.type,
  };

  for (const field of nullablePersonStringFields) {
    normalized[field] = normalizeNullableString(payload[field]);
  }

  return normalized;
}

function requirePersonData(data: Person | null, fallbackMessage: string): Person {
  if (!data) throw new Error(fallbackMessage);
  return data;
}

export async function listPeople(params: PeopleListParams): Promise<PaginatedPeople> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from('people')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  const trimmedSearch = params.search.trim();
  if (trimmedSearch) {
    const escaped = trimmedSearch.replaceAll('%', '\\%').replaceAll('_', '\\_');
    const term = `"%${escaped}%"`;
    query = query.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},national_id.ilike.${term}`);
  }

  if (params.type !== 'all') {
    query = query.eq('type', params.type);
  }

  const { data, count, error } = await query.returns<Person[]>();
  if (error) handleSupabaseError(error, 'تعذر تحميل الأشخاص');
  return { rows: data ?? [], count: count ?? 0 };
}

export async function getPerson(personId: string): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', personId)
    .is('deleted_at', null)
    .single()
    .returns<Person>();
  if (error) handleSupabaseError(error, 'تعذر تحميل بيانات الشخص');
  return requirePersonData(data, 'تعذر تحميل بيانات الشخص');
}

export async function createPerson(payload: PersonPayload): Promise<Person> {
  const { data, error } = await supabase.from('people').insert(normalizePersonPayload(payload)).select('*').single().returns<Person>();
  if (error) handleSupabaseError(error, 'تعذر إنشاء الشخص');
  return requirePersonData(data, 'تعذر إنشاء الشخص');
}

export async function updatePerson(personId: string, payload: PersonPayload): Promise<Person> {
  const updatePayload: PersonUpdate = normalizePersonPayload(payload);
  const { data, error } = await supabase
    .from('people')
    .update(updatePayload)
    .eq('id', personId)
    .is('deleted_at', null)
    .select('*')
    .single()
    .returns<Person>();
  if (error) handleSupabaseError(error, 'تعذر تحديث بيانات الشخص');
  return requirePersonData(data, 'تعذر تحديث بيانات الشخص');
}

export async function softDeletePerson(personId: string): Promise<void> {
  const updatePayload: PersonUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('people').update(updatePayload).eq('id', personId).is('deleted_at', null);
  if (error) handleSupabaseError(error, 'تعذر أرشفة الشخص');
}
