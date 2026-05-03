import { supabase } from '@/services/api/supabaseClient';
import { logger } from '@/infrastructure/observability';
import type { AccountingDocument, ReceiptPostingPayload, ReceiptPostingResult } from './types';
import { ledgerEngine } from '@/services/ledger/LedgerEngine';
import { AuditTrail } from '@/services/audit/AuditTrail';
import { assertDocumentTransition, isLockedDocumentStatus } from './DocumentLifecycle';

const toFiveMinuteBucket = (dateTime: string): number => {
  const parsed = Date.parse(dateTime);
  if (!Number.isFinite(parsed)) return Math.floor(Date.now() / 300000);
  return Math.floor(parsed / 300000);
};

const normalizeAmount = (value: number): string => Number(value || 0).toFixed(3);

const buildReceiptRequestFingerprint = (payload: ReceiptPostingPayload): string => {
  const allocationKey = payload.allocations
    .map((a) => `${a.invoice_id}:${normalizeAmount(a.amount)}`)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .join('|');
  const bucket = toFiveMinuteBucket(payload.receipt.date_time);
  // Include the receipt UUID so two distinct receipts for the same
  // amount/contract within the same 5-minute window are never collapsed.
  // Retries of the exact same receipt (same UUID) still hit the same
  // fingerprint and are correctly de-duplicated by the RPC.
  return [
    'receipt_post',
    payload.receipt.id,
    payload.receipt.contract_id,
    payload.receipt.channel,
    normalizeAmount(payload.receipt.amount),
    String(bucket),
    allocationKey,
  ].join(':');
};

const buildReceiptDocument = (payload: ReceiptPostingPayload): AccountingDocument => ({
  id: payload.receipt.id,
  type: 'receipt',
  date: payload.receipt.date_time,
  propertyId: null,
  partyId: payload.receipt.contract_id,
  amount: Number(payload.receipt.amount || 0),
  currency: 'OMR',
  description: payload.receipt.notes || 'Receipt posting',
  status: 'draft',
  ledgerEntries: payload.journalEntries,
});

class AccountingDocumentEngine {
  async createReceiptDocument(payload: ReceiptPostingPayload): Promise<AccountingDocument> {
    const doc = buildReceiptDocument(payload);
    logger.info('[AccountingDocumentEngine] receipt document created', { id: doc.id, amount: doc.amount });
    await AuditTrail.log({
      action: 'CREATE_DOCUMENT',
      entityType: 'RECEIPT_DOCUMENT',
      entityId: doc.id,
      after: doc,
    });
    return doc;
  }

  async postReceiptDocument(payload: ReceiptPostingPayload): Promise<ReceiptPostingResult> {
    try {
      const document = await this.createReceiptDocument(payload);
      if (isLockedDocumentStatus(document.status)) {
        return { success: false, error: 'لا يمكن تعديل مستند مقفل.' };
      }
      if (!document.ledgerEntries.length) {
        return { success: false, error: 'لا يمكن ترحيل مستند بدون قيود يومية.' };
      }
      assertDocumentTransition(document.status, 'posted');
      const ledgerEntry = ledgerEngine.createFromDocument({ ...document, status: 'posted' });
      await ledgerEngine.validateAndAudit(ledgerEntry);

      const requestId = buildReceiptRequestFingerprint(payload);
      const { data, error } = await supabase.rpc('post_receipt_atomic', {
        payload: {
          request_id: requestId,
          receipt: payload.receipt,
          allocations: payload.allocations,
          journal_entries: payload.journalEntries,
        },
      });

      if (error) {
        logger.error('[AccountingDocumentEngine] post_receipt_atomic RPC error', { message: error?.message, code: error?.code });
        return { success: false, error: error.message || 'تعذر تنفيذ ترحيل السند.' };
      }

      const result = (data || {}) as { success?: boolean; receipt_id?: string; error?: string };
      if (!result.success) {
        const rpcError = result.error || 'فشل ترحيل السند.';
        logger.error('[AccountingDocumentEngine] receipt post failed', { message: rpcError });
        return { success: false, error: rpcError };
      }

      logger.info('[AccountingDocumentEngine] receipt posted', { id: document.id, receiptId: result.receipt_id });
      await AuditTrail.log({
        action: 'UPDATE_DOCUMENT',
        entityType: 'RECEIPT_DOCUMENT',
        entityId: document.id,
        before: { status: document.status },
        after: { status: 'posted', receiptId: result.receipt_id },
      });
      return { success: true, receiptId: result.receipt_id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
      logger.error('[AccountingDocumentEngine] postReceiptDocument unexpected error', { message: (err as any)?.message, code: (err as any)?.code });
      return { success: false, error: message };
    }
  }

  async voidReceiptDocument(payload: {
    receiptId: string;
    voidedAt: string;
    invoiceUpdates: Record<string, unknown>[];
    reverseEntries: Record<string, unknown>[];
  }): Promise<{ ok: boolean; step: string; details?: Record<string, unknown> }> {
    assertDocumentTransition('posted', 'void');
    await ledgerEngine.auditVoid(payload.receiptId);
    const { data, error } = await supabase.rpc('void_receipt_atomic', {
      p_receipt_id: payload.receiptId,
      p_voided_at: payload.voidedAt,
      p_invoice_updates: payload.invoiceUpdates,
      p_reverse_entries: payload.reverseEntries,
    });
    if (error) {
      logger.error('[AccountingDocumentEngine] voidReceiptDocument failed', { message: error?.message, code: error?.code });
      return { ok: false, step: 'void_receipt_atomic', details: { message: error.message } };
    }
    await AuditTrail.log({
      action: 'UPDATE_DOCUMENT',
      entityType: 'RECEIPT_DOCUMENT',
      entityId: payload.receiptId,
      before: { status: 'posted' },
      after: { status: 'void' },
    });
    logger.info('[AccountingDocumentEngine] receipt voided', { id: payload.receiptId });
    return { ok: true, step: 'void_receipt_atomic', details: (data || {}) as Record<string, unknown> };
  }
}

export const accountingDocumentEngine = new AccountingDocumentEngine();
