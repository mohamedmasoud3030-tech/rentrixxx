import { getSupabaseClient } from '@/services/api/supabaseClient';
import { handleError, DatabaseError } from '@/services/utils/errorHandler';

export interface FinancialSummary {
  receiptsToday: number;
  expensesMonth: number;
  totalDeposits: number;
  pendingSettlements: number;
  openInvoices: number;
  collected: number;
  revenue: number;
  expenses: number;
  net: number;
  netIncome: number;
  overdueInvoices: number;
  occupancyRate: number;
  overdueAmount: number;
}

export interface JournalEntry {
  id: string;
  date: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  accountId: string;
  createdAt: number;
}

export class FinanceService {
  // Get financial summary via RPC
  static async getFinancialSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialSummary> {
    try {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const p_from = startDate ? startDate.toISOString().split('T')[0] : firstOfMonth.toISOString().split('T')[0];
      const p_to = endDate ? endDate.toISOString().split('T')[0] : today.toISOString().split('T')[0];

      const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_financial_summary', {
        p_from,
        p_to,
      });

      if (error) throw error;
      
      return (data || {}) as FinancialSummary;
    } catch (error) {
      throw handleError(error);
    }
  }

  // Get journal entries
  static async getJournalEntries(
    startDate: Date,
    endDate: Date
  ): Promise<JournalEntry[]> {
    try {
      const supabase = getSupabaseClient();
      const supabase2 = getSupabaseClient();
      const { data, error } = await supabase2
        .from('journal_entries')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((entry: any) => ({
        id: entry.id,
        date: new Date(entry.date).getTime(),
        description: entry.description,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        balance: entry.balance || 0,
        accountId: entry.account_id,
        createdAt: new Date(entry.created_at).getTime(),
      }));
    } catch (error) {
      throw handleError(error);
    }
  }

  // Calculate balance
  static async calculateBalance(
    startBalance: number,
    debit: number,
    credit: number
  ): Promise<number> {
    return startBalance + credit - debit;
  }

  // Reconcile ledger
  static async reconcileLedger(
    asOfDate: Date
  ): Promise<{ balanced: boolean; discrepancy: number }> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('reconcile_ledger', {
        as_of_date: asOfDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      
      return data || { balanced: false, discrepancy: 0 };
    } catch (error) {
      throw handleError(error);
    }
  }

  // Post receipt (atomic operation)
  static async postReceipt(
    receiptId: string,
    amount: number
  ): Promise<{ success: boolean; receiptId: string }> {
    try {
      const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('post_receipt_atomic', {
        p_receipt_id: receiptId,
        p_amount: amount,
        p_posted_at: Date.now(),
      });

      if (error) throw error;
      
      return data || { success: false, receiptId };
    } catch (error) {
      throw handleError(error);
    }
  }

  // Calculate invoice balance
  static getInvoiceBalance(
    amount: number,
    taxAmount: number = 0,
    paidAmount: number = 0
  ): number {
    return (amount + taxAmount) - paidAmount;
  }

  // Check occupancy rate
  static async getOccupancyRate(): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      const { data: totalUnits, error: e1 } = await supabase
        .from('units')
        .select('id', { count: 'exact' });

      const { data: occupiedUnits, error: e2 } = await supabase
        .from('units')
        .select('id', { count: 'exact' })
        .eq('status', 'occupied');

      if (e1 || e2) throw e1 || e2;

      const total = totalUnits?.length || 0;
      const occupied = occupiedUnits?.length || 0;
      
      return total > 0 ? (occupied / total) * 100 : 0;
    } catch (error) {
      throw handleError(error);
    }
  }
}
