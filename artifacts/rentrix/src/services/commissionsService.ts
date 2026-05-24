import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Rule = Database['public']['Tables']['commission_rules']['Row'];
type RuleInsert = Database['public']['Tables']['commission_rules']['Insert'];
type Commission = Database['public']['Tables']['commissions']['Row'];
type CommissionInsert = Database['public']['Tables']['commissions']['Insert'];

export type CommissionBasis = Rule['basis'];
export type CommissionCalcType = Rule['calc_type'];
export type CommissionStatus = Commission['status'];
export type CommissionSourceType = Commission['source_type'];

export type CommissionRuleView = Rule & {
  recipient_name: string | null;
};

export type CommissionView = Commission & {
  recipient_name: string | null;
  rule_name: string | null;
};

type PersonRelation = { full_name: string | null };
type RuleRelation = { name: string | null };
type RuleQueryRow = Rule & { people: PersonRelation | PersonRelation[] | null };
type CommissionQueryRow = Commission & {
  people: PersonRelation | PersonRelation[] | null;
  commission_rules: RuleRelation | RuleRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function validateRulePayload(payload: RuleInsert) {
  if (!payload.name?.trim()) throw new Error('اسم قاعدة العمولة مطلوب');
  if (payload.calc_type === 'percentage' && ((payload.percentage ?? -1) < 0 || (payload.percentage ?? 101) > 100)) throw new Error('نسبة العمولة يجب أن تكون بين 0 و100');
  if (payload.calc_type === 'fixed' && (payload.fixed_amount ?? 0) <= 0) throw new Error('المبلغ الثابت يجب أن يكون أكبر من صفر');
}

export async function listCommissionRules(supabase: SupabaseClient): Promise<CommissionRuleView[]> {
  const { data, error } = await supabase.from('commission_rules').select('*, people(full_name)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RuleQueryRow[]).map((row) => ({
    ...row,
    recipient_name: firstRelation(row.people)?.full_name ?? null,
  }));
}

export async function createCommissionRule(supabase: SupabaseClient, payload: RuleInsert) {
  validateRulePayload(payload);
  const { data, error } = await supabase.from('commission_rules').insert(payload).select('*').single();
  if (error) throw error;
  return data as Rule;
}

export async function updateCommissionRule(supabase: SupabaseClient, id: string, payload: Partial<RuleInsert>) {
  const { data, error } = await supabase.from('commission_rules').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Rule;
}

export async function listCommissions(supabase: SupabaseClient): Promise<CommissionView[]> {
  const { data, error } = await supabase.from('commissions').select('*, people(full_name), commission_rules(name)').is('deleted_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CommissionQueryRow[]).map((row) => ({
    ...row,
    recipient_name: firstRelation(row.people)?.full_name ?? null,
    rule_name: firstRelation(row.commission_rules)?.name ?? null,
  }));
}

export async function createCommission(supabase: SupabaseClient, payload: CommissionInsert) {
  if ((payload.amount ?? 0) <= 0) throw new Error('قيمة العمولة يجب أن تكون أكبر من صفر');
  const { data, error } = await supabase.from('commissions').insert(payload).select('*').single();
  if (error) throw error;
  return data as Commission;
}

export async function updateCommissionStatus(supabase: SupabaseClient, id: string, status: CommissionStatus) {
  const patch: Partial<CommissionInsert> = { status };
  if (status === 'paid') patch.paid_date = new Date().toISOString().slice(0, 10);
  if (status !== 'paid') patch.paid_date = null;
  const { data, error } = await supabase.from('commissions').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Commission;
}
