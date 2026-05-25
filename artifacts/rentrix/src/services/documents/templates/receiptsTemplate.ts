import type { DocumentRenderModel } from '../documentTypes';

export type ReceiptTemplateInput = Readonly<{
  generatedAt: string;
  companyName: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  paymentDate: string;
  paymentMethod: string;
  amount: string;
  tenant: string;
  property: string;
  unit: string;
  reference: string;
}>;

export const buildReceiptTemplate = (input: ReceiptTemplateInput): DocumentRenderModel => ({
  title: 'سند قبض', fileName: `receipt-${input.receiptNumber}`, generatedAt: input.generatedAt, direction: 'rtl', orientation: 'portrait', branding: { companyName: input.companyName },
  metadata: [
    { label: 'رقم الإيصال', value: input.receiptNumber },
    { label: 'المبلغ', value: input.amount },
    { label: 'التاريخ', value: input.paymentDate },
  ],
  tables: [{ title: 'تفاصيل الإيصال', columns: ['الحقل', 'القيمة'], rows: [
    ['معرّف الدفع', input.paymentId], ['معرّف الفاتورة', input.invoiceId], ['طريقة الدفع', input.paymentMethod], ['المستأجر', input.tenant], ['العقار', input.property], ['الوحدة', input.unit], ['المرجع', input.reference],
  ] }],
  footerNotes: ['تم إنشاء هذا الإيصال من بيانات النظام التشغيلية.'],
  signatureLabels: ['المستلم', 'المحاسب'],
});
