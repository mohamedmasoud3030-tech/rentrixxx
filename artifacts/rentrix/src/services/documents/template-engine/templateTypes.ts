export type TemplateDirection = 'rtl' | 'ltr';
export type TemplateOrientation = 'portrait' | 'landscape';

export type TemplateBranding = Readonly<{
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  logoUrl?: string;
  primaryColor?: string;
}>;

export type TemplateSummaryItem = Readonly<{
  label: string;
  value: string;
}>;

export type TemplateTable = Readonly<{
  title?: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
  totals?: readonly string[];
}>;

export type TemplateModel = Readonly<{
  fileName: string;
  title: string;
  generatedAt: string;
  direction: TemplateDirection;
  orientation?: TemplateOrientation;
  branding: TemplateBranding;
  metadata?: ReadonlyArray<TemplateSummaryItem>;
  summaryItems?: ReadonlyArray<TemplateSummaryItem>;
  tables?: ReadonlyArray<TemplateTable>;
  notes?: readonly string[];
}>;

export type TemplateEngine = Readonly<{
  preview(model: TemplateModel): void;
  download(model: TemplateModel): void;
}>;
