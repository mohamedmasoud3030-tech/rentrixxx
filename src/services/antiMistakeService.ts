import { supabase } from './supabase';
import { logger } from './logger';
import {
  postReceiptAtomic as postReceiptAtomicFromReceiptService,
  type ReceiptPostingPayload,
  type ReceiptPostingResult,
} from './receiptService';

export interface OperationBreakdown {
  ok: boolean;
  step: string;
  details?: Record<string, unknown>;
}

export async function voidReceiptAtomic(payload: {
  receiptId: string;
  voidedAt: number;
  invoiceUpdates: Record<string, unknown>[];
  reverseEntries: Record<string, unknown>[];
}): Promise<OperationBreakdown> {
  const { data, error } = await supabase.rpc('void_receipt_atomic', {
    p_receipt_id: payload.receiptId,
    p_voided_at: payload.voidedAt,
    p_invoice_updates: payload.invoiceUpdates,
    p_reverse_entries: payload.reverseEntries,
  });
  if (error) {
    logger.error('[AntiMistake] voidReceiptAtomic failed', error);
    return { ok: false, step: 'void_receipt_atomic', details: { message: error.message } };
  }
  return { ok: true, step: 'void_receipt_atomic', details: (data || {}) as Record<string, unknown> };
}

export async function renewContractAtomic(oldContractId: string, newContract: Record<string, unknown>): Promise<OperationBreakdown> {
  const { data, error } = await supabase.rpc('renew_contract_atomic', {
    p_old_contract_id: oldContractId,
    p_new_contract: newContract,
  });
  if (error) {
    logger.error('[AntiMistake] renewContractAtomic failed', error);
    return { ok: false, step: 'renew_contract_atomic', details: { message: error.message } };
  }
  return { ok: true, step: 'renew_contract_atomic', details: (data || {}) as Record<string, unknown> };
}

export async function syncUnitStatus(unitId: string): Promise<void> {
  const { error } = await supabase.rpc('sync_unit_status', { p_unit_id: unitId });
  if (error) logger.warn('[AntiMistake] syncUnitStatus failed', error);
}
