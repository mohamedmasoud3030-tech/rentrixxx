import type { DocumentRenderModel } from '../documentTypes';

type ContractRow = Readonly<{ contractNumber: string; tenant: string; property: string; unit: string; status: string; startDate: string; endDate: string; amount: string }>;
export type ContractsTemplateInput = Readonly<{ generatedAt: string; companyName: string; contracts: readonly ContractRow[] }>;

export const buildContractsTemplate = (input: ContractsTemplateInput): DocumentRenderModel => ({
  title: 'تقرير العقود', fileName: 'contracts-report', generatedAt: input.generatedAt, direction: 'rtl', orientation: 'portrait', branding: { companyName: input.companyName },
  summaryItems: [{ label: 'عدد العقود', value: String(input.contracts.length) }],
  tables: [{ title: 'قائمة العقود', columns: ['رقم العقد', 'المستأجر', 'العقار', 'الوحدة', 'الحالة', 'البداية', 'النهاية', 'الإيجار'], rows: input.contracts.map((contract) => [contract.contractNumber, contract.tenant, contract.property, contract.unit, contract.status, contract.startDate, contract.endDate, contract.amount]) }],
  notes: ['يعرض التقرير العقود الناتجة من الفلاتر الحالية في الصفحة.'],
});
