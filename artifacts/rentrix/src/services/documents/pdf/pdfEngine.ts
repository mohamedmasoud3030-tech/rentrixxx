import type { DocumentActionResult, DocumentRenderModel } from '../documentTypes';

export const pdfEngine = {
  downloadPdf(_model: DocumentRenderModel): DocumentActionResult {
    return { success: false, errorMessage: 'تنزيل PDF الحالي يعتمد على طباعة المتصفح (Save as PDF) من شاشة المعاينة.' };
  },
};
