import { createOperationId, normalizeStatus, nowIso, operationsSupabase, throwIfError } from './service-utils';
import type { OperationsDatabase } from '@/types/operations-database';

type Prospect = OperationsDatabase['public']['Tables']['leads']['Row'];
export type ProspectInput = Pick<Prospect, 'name' | 'phone' | 'email' | 'source' | 'notes'>;

export async function listProspects(): Promise<Prospect[]> {
  const { data, error } = await operationsSupabase.from('leads').select('*').or('status.is.null,status.neq.CLOSED').order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createProspect(payload: ProspectInput): Promise<Prospect> {
  if (!payload.name?.trim()) throw new Error('اسم العميل المحتمل مطلوب');
  if (!payload.phone?.trim()) throw new Error('رقم هاتف العميل المحتمل مطلوب');
  const timestamp = nowIso();
  const { data, error } = await operationsSupabase
    .from('leads')
    .insert({ ...payload, id: createOperationId(), status: 'NEW', created_at: timestamp, updated_at: timestamp })
    .select('*')
    .single();
  throwIfError(error);
  return data;
}

export async function updateProspectStatus(prospectId: string, status: string): Promise<void> {
  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus) throw new Error('حالة العميل المحتمل مطلوبة');
  const { error } = await operationsSupabase.from('leads').update({ status: normalizedStatus, updated_at: nowIso() }).eq('id', prospectId);
  throwIfError(error);
}

export async function archiveProspect(prospectId: string): Promise<void> {
  const { error } = await operationsSupabase.from('leads').update({ status: 'CLOSED', updated_at: nowIso() }).eq('id', prospectId);
  throwIfError(error);
}
