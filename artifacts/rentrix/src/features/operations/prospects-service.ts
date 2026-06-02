import { operationsSupabase, throwIfError } from './service-utils';
import type { OperationsDatabase } from '@/types/operations-database';

type Prospect = OperationsDatabase['public']['Tables']['leads']['Row'];
export type ProspectInput = Pick<Prospect, 'name' | 'phone' | 'email' | 'source' | 'notes'>;

export async function listProspects(): Promise<Prospect[]> {
  const { data, error } = await operationsSupabase.from('leads').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createProspect(payload: ProspectInput): Promise<Prospect> {
  if (!payload.name?.trim()) throw new Error('اسم العميل المحتمل مطلوب');
  const { data, error } = await operationsSupabase.from('leads').insert({ ...payload, status: 'new' }).select('*').single();
  throwIfError(error);
  return data;
}

export async function updateProspectStatus(prospectId: string, status: string): Promise<void> {
  const { error } = await operationsSupabase.from('leads').update({ status }).eq('id', prospectId);
  throwIfError(error);
}

export async function archiveProspect(prospectId: string): Promise<void> {
  const { error } = await operationsSupabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', prospectId);
  throwIfError(error);
}
