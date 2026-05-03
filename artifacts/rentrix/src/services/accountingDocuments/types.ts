import type { ReceiptsRow } from '@/types/database';

export type AccountingDocumentType = 'receipt' | 'payment' | 'invoice' | 'adjustment' | 'manual_entry';
export type AccountingDocumentStatus = 'draft' | 'posted' | 'void';

export interface AccountingLedgerEntry {
  id: string;
  no: string;
  date: string;
  account_id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  source_id: string;
  entity_type?: 'CONTRACT' | 'TENANT' | '';
  entity_id?: string;
  created_at: string;
}

export interface AccountingDocument {
  id: string;
  type: AccountingDocumentType;
  date: string;
  propertyId?: string | null;
  partyId?: string | null;
  amount: number;
  currency: string;
  description?: string;
  status: AccountingDocumentStatus;
  ledgerEntries: AccountingLedgerEntry[];
}

export interface ReceiptPostingPayload {
  receipt: Omit<ReceiptsRow, 'id' | 'created_at' | 'updated_at'> & { id: string; created_at: string; updated_at?: string | null };
  allocations: Array<{
    id: string;
    receipt_id: string;
    invoice_id: string;
    amount: number;
    created_at: string;
  }>;
  journalEntries: AccountingLedgerEntry[];
}

export interface ReceiptPostingResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}
