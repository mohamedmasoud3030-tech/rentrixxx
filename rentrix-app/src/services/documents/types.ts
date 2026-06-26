export type SignatureRole = 'owner' | 'tenant' | 'accountant' | 'general_manager';

export type DocumentHeader = {
  companyName: string;
  companyAddress?: string | null;
  companyPhone?: string | null;
  title: string;
  documentNo?: string | null;
  dateLabel?: string | null;
  dateValue?: string | null;
  currency?: string;
};

export type DocumentKpi = { label: string; value: string };

export type DocumentTable = {
  title?: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
};

export type UnifiedDocumentModel = {
  type: string;
  header: DocumentHeader;
  kpis: DocumentKpi[];
  tables: DocumentTable[];
  charts?: Array<{ kind: string; title: string }>;
  footer: {
    signatures: SignatureRole[];
    companyStampLabel?: string | null;
    metadata?: string | null;
  };
  fileName: string;
};

export type DocumentRequest = { type: string; payload: unknown };
