import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Database } from '@/types/database';
import type { CommissionFilters, CommissionFormValues, CommissionRecord } from '../types';

type CommissionInsert = Database['public']['Tables']['commissions']['Insert'];
type CommissionUpdate = Database['public']['Tables']['commissions']['Update'];

function numberOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function deriveAmount(values: CommissionFormValues) {
  const amount = numberOrNull(values.amount);
  if (amount !== null) return amount;
  const dealValue = numberOrNull(values.deal_value);
  const percentage = numberOrNull(values.percentage);
  if (dealValue !== null && percentage !== null) return Number((dealValue * (percentage / 100)).toFixed(2));
  return null;
}

function commissionPayload(values: CommissionFormValues): CommissionInsert {
  return {
    id: crypto.randomUUID(),
    staff_name: values.staff_name.trim(),
    type: values.type,
    status: values.status,
    source_id: values.source_id.trim() || null,
    deal_value: numberOrNull(values.deal_value),
    percentage: numberOrNull(values.percentage),
    amount: deriveAmount(values),
    paid_at: values.status === 'paid' ? Date.now() : null,
  };
}

export async function listCommissions(filters: CommissionFilters) {
  let query = supabase.from('commissions').select('*').order('created_at', { ascending: false });
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.type !== 'all') query = query.eq('type', filters.type);
  if (filters.query.trim()) {
    const term = `%${filters.query.trim()}%`;
    query = query.or(`staff_name.ilike.${term},source_id.ilike.${term},type.ilike.${term}`);
  }

  const { data, error } = await query.returns<CommissionRecord[]>();
  if (error) handleSupabaseError(error, 'تعذر تحميل العمولات');
  return data ?? [];
}

export async function createCommission(values: CommissionFormValues) {
  if (!values.staff_name.trim()) throw new Error('اسم الموظف أو الوسيط مطلوب.');
  if (deriveAmount(values) === null) throw new Error('أدخل قيمة العمولة أو قيمة الصفقة والنسبة.');
  const { data, error } = await supabase.from('commissions').insert(commissionPayload(values)).select('*').single().returns<CommissionRecord>();
  if (error) handleSupabaseError(error, 'تعذر حفظ العمولة');
  return data;
}

export async function updateCommission(id: string, values: CommissionFormValues) {
  if (!values.staff_name.trim()) throw new Error('اسم الموظف أو الوسيط مطلوب.');
  if (deriveAmount(values) === null) throw new Error('أدخل قيمة العمولة أو قيمة الصفقة والنسبة.');
  const { id: _newId, ...basePayload } = commissionPayload(values);
  const payload: CommissionUpdate = { ...basePayload, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('commissions').update(payload).eq('id', id).select('*').single().returns<CommissionRecord>();
  if (error) handleSupabaseError(error, 'تعذر تحديث العمولة');
  return data;
}

export async function archiveCommission(id: string) {
  const { data, error } = await supabase.from('commissions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).select('*').single().returns<CommissionRecord>();
  if (error) handleSupabaseError(error, 'تعذر إلغاء العمولة');
  return data;
}
