import { supabase } from '@/services/api/supabaseClient';
import { handleError, NotFoundError } from '@/services/utils/errorHandler';

export interface Invoice {
  id: string;
  contractId: string;
  amount: number;
  taxAmount?: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'OVERDUE';
  dueDate: number;
  createdAt: number;
  updatedAt: number;
}

export class InvoiceService {
  static async list(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(i => this.mapInvoice(i));
    } catch (error) {
      throw handleError(error);
    }
  }

  static async get(id: string): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) throw new NotFoundError('الفاتورة', id);
      
      return this.mapInvoice(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async create(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          contract_id: invoice.contractId,
          amount: invoice.amount,
          tax_amount: invoice.taxAmount,
          paid_amount: invoice.paidAmount,
          status: invoice.status,
          due_date: new Date(invoice.dueDate).toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapInvoice(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: updates.status,
          paid_amount: updates.paidAmount,
          tax_amount: updates.taxAmount,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return this.mapInvoice(data);
    } catch (error) {
      throw handleError(error);
    }
  }

  static async markAsOverdue(id: string): Promise<Invoice> {
    return this.update(id, { status: 'OVERDUE' });
  }

  static async markAsPaid(id: string, paidAmount: number): Promise<Invoice> {
    const invoice = await this.get(id);
    const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
    const status = paidAmount >= total ? 'PAID' : 'PARTIALLY_PAID';
    
    return this.update(id, {
      status,
      paidAmount,
    });
  }

  private static mapInvoice(data: any): Invoice {
    return {
      id: data.id,
      contractId: data.contract_id,
      amount: data.amount,
      taxAmount: data.tax_amount,
      paidAmount: data.paid_amount,
      status: data.status,
      dueDate: new Date(data.due_date).getTime(),
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  }
}
