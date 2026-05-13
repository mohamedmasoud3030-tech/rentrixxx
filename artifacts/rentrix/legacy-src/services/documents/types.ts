export type DocumentType =
  | 'receipt'
  | 'payment'
  | 'expense_voucher'
  | 'statement'
  | 'property_statement'
  | 'tenant_statement'
  | 'contract'
  | 'invoice'
  | 'trial_balance'
  | 'income_statement'
  | 'balance_sheet';

export type SignatureRole = 'owner' | 'tenant' | 'accountant' | 'general_manager';

export interface DocumentHeader {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  title: string;
  documentNo?: string;
  dateLabel?: string;
  dateValue?: string;
  currency?: string;
}

export interface DocumentTable {
  title?: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
}

export interface DocumentChart {
  kind: 'bar' | 'pie' | 'trend';
  title: string;
  points: Array<{ label: string; value: number }>;
}

export interface DocumentFooter {
  signatures: SignatureRole[];
  companyStampLabel?: string;
  metadata?: string;
}

export interface UnifiedDocumentModel {
  type: DocumentType;
  header: DocumentHeader;
  kpis: Array<{ label: string; value: string }>;
  tables: DocumentTable[];
  charts?: DocumentChart[];
  footer: DocumentFooter;
  fileName: string;
}

export interface DocumentRequest {
  type: DocumentType;
  payload: Record<string, unknown>;
}
