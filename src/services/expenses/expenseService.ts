import { getSupabaseClient } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Expense {
  id: string;
  amount: number;
  description?: string;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  dateTime: number;
  propertyId?: string;
  createdAt: number;
  updatedAt: number;
}

export class ExpenseService {
  static async list(): Promise<Expense[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date_time', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(e => this.mapExpense(e));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Expense> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('المصروف', id);
      
      return this.mapExpense(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    try {
      const supabase = getSupabaseClient();
        .insert([{
          amount: expense.amount,
          description: expense.description,
          status: expense.status || 'DRAFT',
          date_time: new Date(expense.dateTime).toISOString(),
          property_id: expense.propertyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapExpense(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: updates.amount,
          description: updates.description,
          status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return this.mapExpense(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async post(id: string): Promise<Expense> {
    return this.update(id, { status: 'POSTED' });
  }

  static async void(id: string): Promise<Expense> {
    return this.update(id, { status: 'VOID' });
  }

  private static mapExpense(data: any): Expense {
    return {
      id: data.id,
      amount: data.amount,
      description: data.description,
      status: data.status,
      dateTime: new Date(data.date_time).getTime(),
      propertyId: data.property_id,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
