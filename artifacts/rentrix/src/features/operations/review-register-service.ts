import { operationsSupabase, throwIfError } from './service-utils';
import type { OperationsDatabase } from '@/types/operations-database';

type ReviewEntry = OperationsDatabase['public']['Tables']['commissions']['Row'];
export type ReviewEntryInput = Pick<ReviewEntry, 'title' | 'amount' | 'rate' | 'period' | 'notes'>;

export async function listReviewEntries(): Promise<ReviewEntry[]> {
  const { data, error } = await operationsSupabase.from('commissions').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createReviewEntry(payload: ReviewEntryInput): Promise<ReviewEntry> {
  if (!payload.title?.trim()) throw new Error('وصف العمولة مطلوب');
  if (!Number.isFinite(payload.amount ?? Number.NaN) || Number(payload.amount) < 0) throw new Error('قيمة العمولة يجب أن تكون رقماً صالحاً وغير سالب');
  if (payload.rate !== null && payload.rate !== undefined && (!Number.isFinite(payload.rate) || payload.rate < 0)) throw new Error('نسبة العمولة يجب أن تكون رقماً صالحاً وغير سالب');
  const { data, error } = await operationsSupabase.from('commissions').insert({ ...payload, status: 'draft' }).select('*').single();
  throwIfError(error);
  return data;
}

export async function archiveReviewEntry(recordId: string): Promise<void> {
  const { error } = await operationsSupabase.from('commissions').update({ deleted_at: new Date().toISOString() }).eq('id', recordId);
  throwIfError(error);
}
