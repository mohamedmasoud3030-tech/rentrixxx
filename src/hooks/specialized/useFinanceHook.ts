import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { logger } from '../../services/logger';
import { supabaseData } from '../../services/supabaseDataService';
import { financeFacade } from '@/domain/finance/finance.facade';
import { toNumber, round3 } from '../../services/financeService';
import { Invoice, ReceiptAllocation, JournalEntry, Expense, Settings, Database, Commission } from '../../types';

export const useFinanceHook = (
  db: Database | null,
  settings: Settings | null,
  isReadOnly: boolean,
  refreshData: () => Promise<void>,
  audit: (action: string, table: string, id: string, details?: string) => Promise<void>,
  setIsDataStale: (stale: boolean) => void,
  logOperationTime: (op: string, time: number) => void
) => {

  const postJournalEntrySupabase = useCallback(async (params: { dr: string; cr: string; amount: number; ref: string; date?: string; entityType?: 'CONTRACT' | 'TENANT'; entityId?: string }) => {
    const facadeJournal = await financeFacade.postJournalEntry(params);
    if (facadeJournal) return facadeJournal;
    
    if (params.entityType && !['CONTRACT', 'TENANT'].includes(params.entityType)) {
      throw new Error(`Invalid entityType: ${params.entityType}. Must be 'CONTRACT' or 'TENANT'`);
    }
    
    const now = Date.now();
    const date = params.date || new Date().toISOString().slice(0, 10);
    const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
    const entries = [
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.dr, amount: params.amount, type: 'DEBIT' as const, sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
      { id: crypto.randomUUID(), no: voucherNo, date, accountId: params.cr, amount: params.amount, type: 'CREDIT' as const, sourceId: params.ref, entityType: params.entityType, entityId: params.entityId, createdAt: now },
    ];
    await supabaseData.bulkInsert('journalEntries', entries);
  }, []);

  const postInvoiceJournalEntries = useCallback(async (invoice: Invoice) => {
    const facadePostInvoice = await financeFacade.postInvoice(invoice);
    if (facadePostInvoice) return facadePostInvoice;
    if (!settings) return;
    const mappings = settings.accounting.accountMappings;
    const arAccount = mappings.accountsReceivable;
    const typeCreditMap: Record<Invoice['type'], string> = {
      RENT: mappings.revenue.RENT,
      LATE_FEE: mappings.revenue.LATE_FEE || mappings.revenue.RENT,
      MAINTENANCE: mappings.revenue.RENT,
      UTILITY: mappings.revenue.RENT,
    };
    const revenueAccount = typeCreditMap[invoice.type] || mappings.revenue.RENT;
    const netAmount = Math.max(0, toNumber(invoice.amount));
    const taxAmount = Math.max(0, toNumber(invoice.taxAmount));
    if (netAmount > 0.001) {
      await postJournalEntrySupabase({
        dr: arAccount,
        cr: revenueAccount,
        amount: netAmount,
        ref: invoice.id,
        date: invoice.dueDate,
        entityType: 'CONTRACT',
        entityId: invoice.contractId,
      });
    }
    if (taxAmount > 0.001 && mappings.vatPayable) {
      await postJournalEntrySupabase({
        dr: arAccount,
        cr: mappings.vatPayable,
        amount: taxAmount,
        ref: `${invoice.id}-tax`,
        date: invoice.dueDate,
        entityType: 'CONTRACT',
        entityId: invoice.contractId,
      });
    }
  }, [settings, postJournalEntrySupabase]);

  const reverseAllJournalEntries = useCallback(async (sourceId: string) => {
    const entries = await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', sourceId);
    if (!entries.length) return;
    const voucherNo = String(await supabaseData.incrementSerial('journalEntry'));
    const now = Date.now();
    const reverseEntries: JournalEntry[] = entries.map((entry) => ({
      ...entry,
      id: crypto.randomUUID(),
      no: voucherNo,
      type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      sourceId: `${sourceId}-void`,
      createdAt: now,
    }));
    await supabaseData.bulkInsert('journalEntries', reverseEntries);
  }, []);

  const voidReceipt = useCallback(async (id: string) => {
    const startTime = performance.now();
    try {
      await audit('VOID', 'receipts', id);
      const invoiceUpdates: Array<{ id: string; paid_amount: number; status: Invoice['status'] }> = [];
      const allocations = await supabaseData.fetchWhere<ReceiptAllocation>('receiptAllocations', 'receiptId', id);
      for (const alloc of allocations) {
        const invoices = await supabaseData.fetchWhere<Invoice>('invoices', 'id', alloc.invoiceId);
        const invoice = invoices[0];
        if (!invoice) continue;
        const newPaid = Math.max(0, invoice.paidAmount - alloc.amount);
        const newStatus = newPaid <= 0.001 ? (new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
        invoiceUpdates.push({ id: invoice.id, paid_amount: round3(newPaid), status: newStatus });
      }
      const sourceEntries = [
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', id)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-own`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-com`)),
        ...(await supabaseData.fetchWhere<JournalEntry>('journalEntries', 'sourceId', `${id}-vat`)),
      ];
      const reverseEntries: JournalEntry[] = sourceEntries.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        sourceId: `${e.sourceId}-void`,
        type: e.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        createdAt: Date.now(),
      }));
      const atomic = await financeFacade.voidReceipt({
        receiptId: id,
        voidedAt: Date.now(),
        invoiceUpdates,
        reverseEntries: reverseEntries.map(j => ({
          id: j.id, no: j.no, date: j.date, account_id: j.accountId, amount: round3(j.amount), type: j.type, source_id: j.sourceId,
          entity_type: j.entityType || '', entity_id: j.entityId || '', created_at: j.createdAt
        })),
      });
      if (!atomic.ok) throw new Error(String(atomic.details?.message || 'atomic void failed'));

      const endTime = performance.now();
      logOperationTime('voidReceipt', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء السند وتحديث الفواتير بنجاح.');
    } catch (err: unknown) {
      logger.error('voidReceipt failed', { message: err instanceof Error ? err.message : 'unknown_error' });
      toast.error('حدث خطأ أثناء إلغاء السند: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      await refreshData();
    }
  }, [audit, logOperationTime, refreshData, setIsDataStale]);

  const voidExpense = useCallback(async (id: string) => {
    const startTime = performance.now();
    try {
      await supabaseData.update('expenses', id, { status: 'VOID', voidedAt: Date.now() });
      await audit('VOID', 'expenses', id);
      await reverseAllJournalEntries(id);
      const endTime = performance.now();
      logOperationTime('voidExpense', endTime - startTime);
      setIsDataStale(true);
      await refreshData();
      toast.success('تم إلغاء المصروف بنجاح.');
    } catch (err: unknown) {
      logger.error('voidExpense failed', { message: err instanceof Error ? err.message : 'unknown_error' });
      toast.error('حدث خطأ أثناء إلغاء المصروف: ' + (err instanceof Error ? err.message : 'خطأ غير معروف'));
      await refreshData();
    }
  }, [audit, reverseAllJournalEntries, logOperationTime, refreshData, setIsDataStale]);

  const payoutCommission = useCallback(async (commissionId: string) => {
    if (isReadOnly) { toast.error("النظام في وضع القراءة فقط."); return; }
    const commission = await supabaseData.fetchOne<Commission>('commissions', commissionId);
    if (!commission) throw new Error("Commission not found.");
    if (commission.status === 'PAID') throw new Error("Already paid.");

    const expenseId = crypto.randomUUID();
    const expenseNo = String(await supabaseData.incrementSerial('expense'));
    
    const newExpense: Partial<Expense> = {
      id: expenseId,
      no: expenseNo,
      dateTime: new Date().toISOString(),
      category: 'عمولات موظفين',
      amount: commission.amount,
      status: 'POSTED',
      chargedTo: 'OFFICE',
      payee: commission.staffId || 'Unknown',
      notes: `صرف عمولة`,
      contractId: null,
      ref: `COMM-${commissionId.slice(0, 6)}`,
      createdAt: Date.now()
    };

    const result = await supabaseData.insert('expenses', newExpense);
    if (result.error) throw new Error(result.error);
    
    // Post journal entry for the commission expense
    if (settings) {
      const mappings = settings.accounting.accountMappings;
      const cashAccount = mappings.paymentMethods.CASH;
      const expenseAccount = mappings.expenseCategories['عمولات موظفين'] || mappings.expenseCategories.default;
      await postJournalEntrySupabase({ dr: expenseAccount, cr: cashAccount, amount: commission.amount, ref: expenseId });
    }

    await supabaseData.update('commissions', commissionId, { status: 'PAID', expenseId: expenseId, paidAt: Date.now() });
    await refreshData();
    toast.success('تم صرف العمولة بنجاح.');
  }, [isReadOnly, settings, refreshData, postJournalEntrySupabase]);

  return {
    postJournalEntrySupabase,
    postInvoiceJournalEntries,
    reverseAllJournalEntries,
    voidReceipt,
    voidExpense,
    payoutCommission
  };
};
