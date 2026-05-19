import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { Expense } from '@/types/domain';

export type ExpenseFilters = { propertyId: string; category: string; from: string; to: string };
export type ExpensePayload = Pick<Expense, 'property_id' | 'category' | 'amount' | 'expense_date' | 'description'>;

export async function listExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  try {
    let query = supabase.from('expenses').select('*').is('deleted_at', null).order('expense_date', { ascending: false });
    if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.from) query = query.gte('expense_date', filters.from);
    if (filters.to) query = query.lte('expense_date', filters.to);
    const { data, error } = await query.returns<Expense[]>();
    if (error) handleSupabaseError(error);
    return data ?? [];
  } catch (error) {
    handleSupabaseError(error, 'تعذر تحميل المصاريف');
    return [];
  }
}

export async function createExpense(payload: ExpensePayload): Promise<Expense> {
  try {
    const { data, error } = await supabase.from('expenses').insert(payload).select('*').single().returns<Expense>();
    if (error) handleSupabaseError(error);
    if (!data) throw new Error('No expense returned after create');
    return data;
  } catch (error) {
    handleSupabaseError(error, 'تعذر إنشاء المصروف');
    throw error;
  }
}

export async function updateExpense(id: string, payload: ExpensePayload): Promise<Expense> {
  try {
    const { data, error } = await supabase.from('expenses').update(payload).eq('id', id).is('deleted_at', null).select('*').single().returns<Expense>();
    if (error) handleSupabaseError(error);
    if (!data) throw new Error('No expense returned after update');
    return data;
  } catch (error) {
    handleSupabaseError(error, 'تعذر تعديل المصروف');
    throw error;
  }
}
