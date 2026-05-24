import type { TemplateModel, TemplateSummaryItem, TemplateTable } from '../template-engine/templateTypes';

export type OwnerDocumentRow = Readonly<{
  name: string;
  phone?: string | null;
  propertyCount: number;
  contractCount: number;
}>;

export type OwnersDocumentInput = Readonly<{
  generatedAt: string;
  companyName: string;
  owners: readonly OwnerDocumentRow[];
}>;

const formatCount = (value: number): string => value.toLocaleString('ar');

export function buildOwnersDocument(input: OwnersDocumentInput): TemplateModel {
  const linkedOwners = input.owners.filter((owner) => owner.propertyCount > 0);
  const summaryItems: TemplateSummaryItem[] = [
    { label: 'إجمالي الملاك', value: formatCount(input.owners.length) },
    { label: 'الملاك المرتبطون بعقارات', value: formatCount(linkedOwners.length) },
  ];

  const table: TemplateTable = {
    title: 'الملاك',
    columns: ['الاسم', 'الهاتف', 'العقارات', 'العقود'],
    rows: input.owners.map((owner) => [
      owner.name,
      owner.phone ?? '—',
      formatCount(owner.propertyCount),
      formatCount(owner.contractCount),
    ]),
  };

  return {
    fileName: 'owners-report',
    title: 'قائمة الملاك',
    generatedAt: input.generatedAt,
    direction: 'rtl',
    branding: { companyName: input.companyName },
    summaryItems,
    tables: [table],
    notes: ['تم إنشاء هذا المستند من بيانات التشغيل الحالية فقط بدون إنشاء قيود محاسبية أو احتساب مستحقات نهائية.'],
  };
}
