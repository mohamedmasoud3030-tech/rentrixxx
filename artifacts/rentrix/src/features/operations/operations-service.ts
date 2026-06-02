import type { OperationsDatabase } from '@/types/operations-database';
import { createOperationId, nowIso, operationsSupabase, throwIfError } from './service-utils';

export * from './prospects-service';
export * from './review-register-service';

type Land = OperationsDatabase['public']['Tables']['lands']['Row'];
type ContactRecord = OperationsDatabase['public']['Tables']['people']['Row'];
type ChangeHistoryEntry = OperationsDatabase['public']['Tables']['audit_log']['Row'];
type PropertyDirectoryEntry = OperationsDatabase['public']['Tables']['properties']['Row'];

export type LandInput = Pick<Land, 'name' | 'location' | 'area' | 'owner_id' | 'category' | 'owner_price' | 'commission' | 'notes'>;
export type ContactRecordInput = Pick<ContactRecord, 'full_name' | 'phone' | 'email' | 'address' | 'notes'>;

export type OperationsSnapshot = {
  prospects: number;
  reviewEntries: number;
  lands: number;
  contacts: number;
  properties: number;
  changes: number;
};

function assertNonNegative(value: number | null, label: string): void {
  if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${label} يجب أن يكون رقماً صالحاً وغير سالب`);
}

export async function listLands(): Promise<Land[]> {
  const { data, error } = await operationsSupabase.from('lands').select('*').or('status.is.null,status.neq.ARCHIVED').order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createLand(payload: LandInput): Promise<Land> {
  if (!payload.name?.trim()) throw new Error('اسم الأرض مطلوب');
  if (!payload.location?.trim()) throw new Error('موقع الأرض مطلوب');
  assertNonNegative(payload.area, 'مساحة الأرض');
  assertNonNegative(payload.owner_price, 'سعر المالك');
  assertNonNegative(payload.commission, 'العمولة');
  const timestamp = nowIso();
  const { data, error } = await operationsSupabase
    .from('lands')
    .insert({ ...payload, id: createOperationId(), status: 'AVAILABLE', created_at: timestamp, updated_at: timestamp })
    .select('*')
    .single();
  throwIfError(error);
  return data;
}

export async function archiveLand(landId: string): Promise<void> {
  const { error } = await operationsSupabase.from('lands').update({ status: 'ARCHIVED', updated_at: nowIso() }).eq('id', landId);
  throwIfError(error);
}

export async function listContactRecords(): Promise<ContactRecord[]> {
  const { data, error } = await operationsSupabase.from('people').select('*').eq('type', 'contact').is('deleted_at', null).order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createContactRecord(payload: ContactRecordInput): Promise<ContactRecord> {
  if (!payload.full_name.trim()) throw new Error('اسم جهة التواصل مطلوب');
  const { data, error } = await operationsSupabase
    .from('people')
    .insert({ ...payload, id: createOperationId(), type: 'contact' })
    .select('*')
    .single();
  throwIfError(error);
  return data;
}

export async function listChangeHistory(): Promise<ChangeHistoryEntry[]> {
  const { data, error } = await operationsSupabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
  throwIfError(error);
  return data ?? [];
}

export async function listPropertyDirectory(): Promise<PropertyDirectoryEntry[]> {
  const { data, error } = await operationsSupabase.from('properties').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const [prospects, reviewEntries, lands, contacts, properties, changes] = await Promise.all([
    operationsSupabase.from('leads').select('*', { count: 'exact', head: true }),
    operationsSupabase.from('commissions').select('*', { count: 'exact', head: true }),
    operationsSupabase.from('lands').select('*', { count: 'exact', head: true }),
    operationsSupabase.from('people').select('*', { count: 'exact', head: true }).eq('type', 'contact').is('deleted_at', null),
    operationsSupabase.from('properties').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    operationsSupabase.from('audit_log').select('*', { count: 'exact', head: true }),
  ]);

  for (const result of [prospects, reviewEntries, lands, contacts, properties, changes]) throwIfError(result.error);

  return {
    prospects: prospects.count ?? 0,
    reviewEntries: reviewEntries.count ?? 0,
    lands: lands.count ?? 0,
    contacts: contacts.count ?? 0,
    properties: properties.count ?? 0,
    changes: changes.count ?? 0,
  };
}
