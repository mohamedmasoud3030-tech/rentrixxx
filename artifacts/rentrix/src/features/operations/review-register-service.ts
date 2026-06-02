import { createOperationId, nowIso, operationsSupabase, throwIfError } from './service-utils';
import type { OperationsDatabase } from '@/types/operations-database';

type ReviewEntry = OperationsDatabase['public']['Tables']['commissions']['Row'];
export type ReviewEntryInput = Pick<ReviewEntry, 'staff_name' | 'amount' | 'percentage' | 'type' | 'source_id'>;

export async function listReviewEntries(): Promise<ReviewEntry[]> {
  const { data, error } = await operationsSupabase.from('commissions').select('*').or('status.is.null,status.neq.REJECTED').order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createReviewEntry(payload: ReviewEntryInput): Promise<ReviewEntry> {
  if (!payload.staff_name?.trim()) throw new Error('اسم الموظف مطلوب');
  if (payload.amount === null || !Number.isFinite(payload.amount) || payload.amount < 0) throw new Error('قيمة العمولة يجب أن تكون رقماً صالحاً وغير سالب');
  if (payload.percentage !== null && (!Number.isFinite(payload.percentage) || payload.percentage < 0)) throw new Error('نسبة العمولة يجب أن تكون رقماً صالحاً وغير سالب');
  const timestamp = nowIso();
  const { data, error } = await operationsSupabase
    .from('commissions')
    .insert({ ...payload, id: createOperationId(), status: 'PENDING', created_at: timestamp, updated_at: timestamp })
    .select('*')
    .single();
  throwIfError(error);
  return data;
}

export async function archiveReviewEntry(recordId: string): Promise<void> {
  const { error } = await operationsSupabase.from('commissions').update({ status: 'REJECTED', updated_at: nowIso() }).eq('id', recordId);
  throwIfError(error);
}
