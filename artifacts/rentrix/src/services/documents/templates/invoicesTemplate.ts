import type { DocumentRenderModel } from '../documentTypes';

type InvoiceRow = Readonly<{ invoiceNumber: string; dueDate: string; status: string; total: string; remaining: string }>;
export type InvoicesTemplateInput = Readonly<{ generatedAt: string; companyName: string; invoices: readonly InvoiceRow[]; outstandingTotal: string }>;

export const buildInvoicesTemplate = (input: InvoicesTemplateInput): DocumentRenderModel => ({
  title: 'تقرير الفواتير', fileName: 'invoices-report', generatedAt: input.generatedAt, direction: 'rtl', orientation: 'portrait', branding: { companyName: input.companyName },
  summaryItems: [{ label: 'عدد الفواتير', value: String(input.invoices.length) }, { label: 'إجمالي المتبقي', value: input.outstandingTotal }],
  tables: [{ title: 'قائمة الفواتير', columns: ['رقم الفاتورة', 'تاريخ الاستحقاق', 'الحالة', 'الإجمالي', 'المتبقي'], rows: input.invoices.map((invoice) => [invoice.invoiceNumber, invoice.dueDate, invoice.status, invoice.total, invoice.remaining]) }],
  notes: ['الأرقام المعروضة تشغيلية وتعتمد على البيانات المحملة في الصفحة.'],
});
