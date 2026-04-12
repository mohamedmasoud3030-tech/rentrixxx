import { supabase } from './supabase';
import { logger } from './logger';
import type { ReceiptsRow } from '../types/database';

export interface JournalEntryRow {
  id: string;
  no: string;
  date: string;
  account_id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  source_id: string;
  entity_type?: 'CONTRACT' | 'TENANT' | '';
  entity_id?: string;
  created_at: number;
}

export interface ReceiptPostingPayload {
  receipt: Omit<ReceiptsRow, 'id' | 'created_at' | 'updated_at'> & { id: string; created_at: number; updated_at?: number | null };
  allocations: Array<{
    id: string;
    receipt_id: string;
    invoice_id: string;
    amount: number;
    created_at: number;
  }>;
  journalEntries: JournalEntryRow[];
}

export interface ReceiptPostingResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export async function postReceiptAtomic(payload: ReceiptPostingPayload): Promise<ReceiptPostingResult> {
  try {
    const requestId = crypto.randomUUID();
    const { data, error } = await supabase.rpc('post_receipt_atomic', {
      payload: {
        request_id: requestId,
        receipt: payload.receipt,
        allocations: payload.allocations,
        journal_entries: payload.journalEntries,
      },
    });

    if (error) {
      logger.error('[ReceiptService] post_receipt_atomic RPC error', error);
      return { success: false, error: error.message || 'تعذر تنفيذ ترحيل السند.' };
    }

    const result = (data || {}) as { success?: boolean; receipt_id?: string; error?: string };
    if (!result.success) {
      const rpcError = result.error || 'فشل ترحيل السند.';
      logger.error('[ReceiptService] post_receipt_atomic result failure', rpcError);
      return { success: false, error: rpcError };
    }

    return { success: true, receiptId: result.receipt_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    logger.error('[ReceiptService] postReceiptAtomic unexpected error', err);
    return { success: false, error: message };
  }
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
  const { data, error } = await supabase.rpc('void_receipt_atomic', {
    p_receipt_id: payload.receiptId,
    p_voided_at: payload.voidedAt,
    p_invoice_updates: payload.invoiceUpdates,
    p_reverse_entries: payload.reverseEntries,
  });
  if (error) {
    logger.error('[ReceiptService] voidReceiptAtomic failed', error);
    return { ok: false, step: 'void_receipt_atomic', details: { message: error.message } };
  }
  return { ok: true, step: 'void_receipt_atomic', details: (data || {}) as Record<string, unknown> };
}
