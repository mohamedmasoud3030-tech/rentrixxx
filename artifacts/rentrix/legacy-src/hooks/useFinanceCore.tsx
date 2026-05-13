import { useCallback } from 'react';
import { AppContextType, Receipt, Invoice, ReceiptAllocation, JournalEntry, Database, Settings } from '../types';
import { supabaseData } from '../services/supabaseDataService';
import { supabase } from '@/services/api/supabaseClient';
import { voidReceiptAtomic } from '../services/receiptService';
import { runManualAutomation as runManualAutomationService } from '../services/automationService';
import { toast } from 'react-hot-toast';
import { logger } from '../infrastructure/observability';

/**
 * useFinanceCore Hook
 * 
 * Manages all financial-related logic including:
 * - Financial summaries
 * - Receipts and allocations
 * - Expenses and voiding
 * - Journal entries
 * - Monthly invoice generation
 */
export const useFinanceCore = (
  db: Database,
  settings: Settings | null,
  refreshData: () => Promise<void>,
  onAudit: (action: string, entity: string, entityId: string, note?: string) => Promise<void>,
  logOperationTime: (op: string, time: number) => void,
  setIsDataStale: (stale: boolean) => void
) => {

  /**
   * Helper to round numbers to 3 decimal places
   */
  const round3 = (value: number): number => Number(value.toFixed(3));

  /**
   * Fetch financial summary via RPC
   */
  const getFinancialSummary = useCallback(async () => {
    try {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      
      const { data, error } = await supabase.rpc('get_financial_summary', {
        p_start_date: fmt(firstOfMonth),
        p_end_date: fmt(today)
      });

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('[useFinanceCore] getFinancialSummary error', err);
      return null;
    }
  }, []);

  /**
   * Void a receipt and reverse its journal entries
   */
  const voidReceipt: AppContextType['financeService']['voidReceipt'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await onAudit('VOID', 'receipts', id);
      const invoiceUpdates: Array<{ id: string; paid_amount: number; status: Invoice['status'] }> = [];
      
      // Fetch allocations to update related invoices
      const allocations = await supabaseData.fetchWhere<ReceiptAllocation>('receiptAllocations', 'receiptId', id);
      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        
        const newPaid = Math.max(0, invoice.paidAmount - alloc.amount);
        const newStatus = newPaid <= 0.001 
          ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') 
          : 'PARTIALLY_PAID';
          
        invoiceUpdates.push({ id: invoice.id, paid_amount: round3(newPaid), status: newStatus });
      }

      // Fetch source journal entries to reverse them
      const sourceEntries = [
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-own`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-com`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-vat`)),
      ];

      const reverseEntries = sourceEntries.map(e => ({
        id: crypto.randomUUID(),
        no: e.no,
        date: new Date().toISOString().slice(0, 10),
        account_id: e.accountId,
        amount: round3(e.amount),
        type: (e.type === 'DEBIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT',
        source_id: `${e.sourceId}-void`,
        entity_type: e.entityType || '',
        entity_id: e.entityId || '',
        created_at: new Date().toISOString()
      }));

      const atomic = await voidReceiptAtomic({
        receiptId: id,
        voidedAt: new Date().toISOString(),
        invoiceUpdates,
        reverseEntries,
      });

      if (!atomic.ok) throw new Error(String(atomic.details?.message || 'atomic void failed'));

      const endTime = performance.now();
      logOperationTime('voidReceipt', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء السند وتحديث الفواتير بنجاح.');
    } catch (err: unknown) {
      logger.error('[useFinanceCore] voidReceipt failed', err);
      toast.error('حدث خطأ أثناء إلغاء السند: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      await refreshData();
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Void an expense and reverse its journal entries
   */
  const voidExpense: AppContextType['financeService']['voidExpense'] = useCallback(async (id) => {
    const startTime = performance.now();
    try {
      await supabaseData.update('expenses', id, { status: 'VOID', voidedAt: new Date().toISOString() });
      await onAudit('VOID', 'expenses', id);
      
      // Note: reverseAllJournalEntries logic should be implemented or imported
      // For now, we follow the pattern in useAppCoreImpl
      const sourceEntries = await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id);
      for (const entry of sourceEntries) {
        await supabaseData.insert('journalEntries', {
          ...entry,
          id: crypto.randomUUID(),
          sourceId: `${id}-void`,
          type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          createdAt: new Date().toISOString(),
        });
      }

      const endTime = performance.now();
      logOperationTime('voidExpense', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء المصروف بنجاح.');
    } catch (err: unknown) {
      logger.error('[useFinanceCore] voidExpense failed', err);
      toast.error('حدث خطأ أثناء إلغاء المصروف: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      await refreshData();
    }
  }, [onAudit, logOperationTime, setIsDataStale, refreshData]);

  /**
   * Generate monthly invoices manually
   */
  const generateMonthlyInvoices: AppContextType['financeService']['generateMonthlyInvoices'] = useCallback(async () => {
    if (!settings || !db) return 0;
    const startTime = performance.now();
    try {
      const result = await runManualAutomationService(db, settings, {
        invoices: true,
        lateFees: false,
        notifications: false,
        snapshots: false,
      });
      
      const endTime = performance.now();
      logOperationTime('generateMonthlyInvoices', endTime - startTime);
      
      const invoicesCreated = (result as any).stats?.invoicesCreated || 0;
      if (invoicesCreated > 0) {
        setIsDataStale(true);
        await refreshData();
      }
      return invoicesCreated;
    } catch (err) {
      logger.error('[useFinanceCore] generateMonthlyInvoices error', err);
      toast.error('حدث خطأ أثناء توليد الفواتير');
      return 0;
    }
  }, [db, settings, logOperationTime, setIsDataStale, refreshData]);

  return {
    getFinancialSummary,
    voidReceipt,
    voidExpense,
    generateMonthlyInvoices,
    // Note: addReceipt and addManualJournalVoucher are complex and often involve multiple atomic steps
    // They will be handled in the next iteration of refactoring
  };
};
