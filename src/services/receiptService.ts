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
  if (!supabase) {
    return { success: false, error: 'Supabase client unavailable. تحقق من متغيرات البيئة.' };
  }

  try {
    const { data, error } = await supabase.rpc('post_receipt_atomic', {
      p_receipt: payload.receipt,
      p_allocations: payload.allocations,
      p_journal_entries: payload.journalEntries,
    });

    if (error) {
      logger.error('[ReceiptService] post_receipt_atomic RPC error', error);
      return { success: false, error: error.message || 'RPC error' };
    }

    const result = (data || {}) as { success?: boolean; receipt_id?: string; error?: string };
    if (!result.success) {
      const rpcError = result.error || 'Unknown posting failure';
      logger.error('[ReceiptService] post_receipt_atomic result failure', rpcError);
      return { success: false, error: rpcError };
    }

    return { success: true, receiptId: result.receipt_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('[ReceiptService] postReceiptAtomic unexpected error', err);
    return { success: false, error: message };
  }
}
