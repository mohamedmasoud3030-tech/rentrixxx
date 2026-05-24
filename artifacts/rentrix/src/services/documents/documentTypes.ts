export type DocumentTemplateKey =
  | 'owners-report'
  | 'properties-report'
  | 'invoices-report'
  | 'contracts-report'
  | 'receipt'
  | 'arrears-report';

export type DocumentActionResult = Readonly<{ success: boolean; errorMessage?: string }>;

export type DocumentBranding = Readonly<{
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  taxNumber?: string;
  commercialRegistration?: string;
  logoUrl?: string;
  primaryColor?: string;
}>;

export type DocumentHeaderMetaItem = Readonly<{ label: string; value: string }>;
export type DocumentDirection = 'rtl' | 'ltr';
export type DocumentOrientation = 'portrait' | 'landscape';
export type DocumentKV = Readonly<{ label: string; value: string }>;
export type DocumentTable = Readonly<{ title: string; columns: readonly string[]; rows: ReadonlyArray<readonly string[]>; totals?: readonly string[] }>;

export type DocumentRenderModel = Readonly<{
  title: string;
  fileName: string;
  generatedAt: string;
  direction: DocumentDirection;
  orientation: DocumentOrientation;
  branding: DocumentBranding;
  headerMeta?: readonly DocumentHeaderMetaItem[];
  metadata?: readonly DocumentKV[];
  summaryItems?: readonly DocumentKV[];
  tables?: readonly DocumentTable[];
  notes?: readonly string[];
  footerNotes?: readonly string[];
  signatureLabels?: readonly string[];
}>;
