import { postReceiptAtomic, voidReceiptAtomic } from '@/services/receiptService';
import type { JournalEntryRow, ReceiptPostingPayload, ReceiptPostingResult } from '@/services/receiptService';

export type FinanceFacadeDelegates = {
  postJournalEntry?: (params: {
    dr: string;
    cr: string;
    amount: number;
    ref: string;
    date?: string;
    entityType?: 'CONTRACT' | 'TENANT';
    entityId?: string;
  }) => Promise<void>;
  postInvoice?: (invoice: unknown) => Promise<void>;
  getFinancialSummary?: () => Promise<unknown>;
};

export const createFinanceFacade = (delegates: FinanceFacadeDelegates = {}) => ({
  postJournalEntry: (params: Parameters<NonNullable<FinanceFacadeDelegates['postJournalEntry']>>[0]) =>
    delegates.postJournalEntry?.(params),

  postInvoice: (invoice: unknown) => delegates.postInvoice?.(invoice),

  postReceipt: (payload: ReceiptPostingPayload): Promise<ReceiptPostingResult> => postReceiptAtomic(payload),

  voidReceipt: (payload: {
    receiptId: string;
    voidedAt: string;
    invoiceUpdates: Record<string, unknown>[];
    reverseEntries: Record<string, unknown>[];
  }): Promise<{ ok: boolean; step: string; details?: Record<string, unknown> }> => voidReceiptAtomic(payload),

  getFinancialSummary: () => delegates.getFinancialSummary?.(),
});

export type { JournalEntryRow };
export const financeFacade = createFinanceFacade();
