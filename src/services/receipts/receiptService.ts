import { supabase } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Receipt {
  id: string;
  amount: number;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  dateTime: number;
  createdAt: number;
  updatedAt: number;
}

export class ReceiptService {
  static async list(): Promise<Receipt[]> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('date_time', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(r => this.mapReceipt(r));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Receipt> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('سند القبض', id);
      
      return this.mapReceipt(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .insert([{
          amount: receipt.amount,
          status: receipt.status || 'DRAFT',
          date_time: new Date(receipt.dateTime).toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapReceipt(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async post(id: string): Promise<Receipt> {
    try {
      const receipt = await this.get(id);
      const { data, error } = await supabase.rpc('post_receipt_atomic', {
        p_receipt_id: id,
        p_amount: receipt.amount,
        p_posted_at: Date.now(),
      });

      if (error) throw error;
      
      return this.update(id, { status: 'POSTED' });
    } catch (error) {
      throw handleError(error);
    }
  }

  static async void(id: string): Promise<Receipt> {
    try {
      const { data, error } = await supabase.rpc('void_receipt_atomic', {
        p_receipt_id: id,
        p_voided_at: Date.now(),
      });

      if (error) throw error;
      
      return this.update(id, { status: 'VOID' });
    } catch (error) {
      throw handleError(error);
    }
  }

  private static async update(id: string, updates: Partial<Receipt>): Promise<Receipt> {
    const { data, error } = await supabase
      .from('receipts')
      .update({ status: updates.status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return this.mapReceipt(data);
  }

  private static mapReceipt(data: any): Receipt {
    return {
      id: data.id,
      amount: data.amount,
      status: data.status,
      dateTime: new Date(data.date_time).getTime(),
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
