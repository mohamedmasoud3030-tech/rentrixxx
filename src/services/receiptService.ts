import { accountingDocumentEngine } from '@/services/accountingDocuments/AccountingDocumentEngine';
import type { AccountingLedgerEntry as JournalEntryRow, ReceiptPostingPayload, ReceiptPostingResult } from '@/services/accountingDocuments/types';
export type { JournalEntryRow, ReceiptPostingPayload, ReceiptPostingResult };

export async function postReceiptAtomic(payload: ReceiptPostingPayload): Promise<ReceiptPostingResult> {
  return accountingDocumentEngine.postReceiptDocument(payload);
}

export const receiptService = {
  postReceipt: postReceiptAtomic,
};

export async function voidReceiptAtomic(payload: {
  receiptId: string;
  voidedAt: number;
  invoiceUpdates: Record<string, unknown>[];
  reverseEntries: Record<string, unknown>[];
}): Promise<{ ok: boolean; step: string; details?: Record<string, unknown> }> {
  return accountingDocumentEngine.voidReceiptDocument(payload);
}
