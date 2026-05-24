import type { DocumentRenderModel } from '../documentTypes';

type ArrearsRow = Readonly<{ invoice: string; tenant: string; dueDate: string; daysOverdue: string; remaining: string }>;
export type ArrearsTemplateInput = Readonly<{ generatedAt: string; companyName: string; rows: readonly ArrearsRow[]; totalOverdue: string; overdueInvoiceCount: string }>;

export const buildArrearsTemplate = (input: ArrearsTemplateInput): DocumentRenderModel => ({
  title: 'تقرير المتأخرات', fileName: 'arrears-report', generatedAt: input.generatedAt, direction: 'rtl', orientation: 'portrait', branding: { companyName: input.companyName },
  summaryItems: [{ label: 'إجمالي المتأخر', value: input.totalOverdue }, { label: 'عدد الفواتير المتأخرة', value: input.overdueInvoiceCount }],
  tables: [{ title: 'الفواتير المتأخرة', columns: ['الفاتورة', 'المستأجر', 'تاريخ الاستحقاق', 'أيام التأخير', 'المتبقي'], rows: input.rows.map((row) => [row.invoice, row.tenant, row.dueDate, row.daysOverdue, row.remaining]) }],
  notes: ['لا يتضمن التقرير أي قيود محاسبية أو تسويات خارج البيانات التشغيلية.'],
});
