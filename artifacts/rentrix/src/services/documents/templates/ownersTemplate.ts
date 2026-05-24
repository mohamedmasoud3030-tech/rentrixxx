import type { DocumentRenderModel } from '../documentTypes';

type Row = Readonly<{ name: string; phone?: string | null; propertyCount: number; contractCount: number }>;
export type OwnersTemplateInput = Readonly<{ generatedAt: string; companyName: string; owners: readonly Row[] }>;

export const buildOwnersTemplate = (input: OwnersTemplateInput): DocumentRenderModel => ({
  title: 'قائمة الملاك', fileName: 'owners-report', generatedAt: input.generatedAt, direction: 'rtl', orientation: 'portrait',
  branding: { companyName: input.companyName },
  summaryItems: [{ label: 'إجمالي الملاك', value: String(input.owners.length) }],
  tables: [{ title: 'الملاك', columns: ['الاسم', 'الهاتف', 'العقارات', 'العقود'], rows: input.owners.map((o) => [o.name, o.phone ?? '—', String(o.propertyCount), String(o.contractCount)]) }],
  notes: ['بيانات تشغيلية فقط.'],
});
