import type { DocumentRenderModel } from '../documentTypes';

type PropertyRow = Readonly<{ title: string; type: string; owner: string; status: string; address: string; amount: string }>;
export type PropertiesTemplateInput = Readonly<{ generatedAt: string; companyName: string; properties: readonly PropertyRow[] }>;

export const buildPropertiesTemplate = (input: PropertiesTemplateInput): DocumentRenderModel => ({
  title: 'تقرير العقارات',
  fileName: 'properties-report',
  generatedAt: input.generatedAt,
  direction: 'rtl',
  orientation: 'portrait',
  branding: { companyName: input.companyName },
  summaryItems: [{ label: 'إجمالي العقارات', value: String(input.properties.length) }],
  tables: [{ title: 'قائمة العقارات', columns: ['العقار', 'النوع', 'المالك', 'الحالة', 'العنوان', 'القيمة'], rows: input.properties.map((p) => [p.title, p.type, p.owner, p.status, p.address, p.amount]) }],
  notes: ['تقرير تشغيلي مبني على بيانات العقارات الحالية.'],
});
