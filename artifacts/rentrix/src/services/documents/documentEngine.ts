import { exportEngine } from './export/exportEngine';
import { pdfEngine } from './pdf/pdfEngine';
import { printEngine } from './print/printEngine';
import { htmlTemplateEngine } from './template-engine/htmlTemplateEngine';
import { documentRegistry } from './documentRegistry';
import type { DocumentActionResult, DocumentTemplateKey } from './documentTypes';

const build = (templateKey: DocumentTemplateKey, data: unknown) => documentRegistry[templateKey](data);

export const documentEngine = {
  previewDocument(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return printEngine.preview(build(templateKey, data)); },
  printDocument(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return printEngine.print(build(templateKey, data)); },
  downloadHtml(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult {
    const model = build(templateKey, data);
    const html = htmlTemplateEngine.renderDownloadHtml(model);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.fileName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  },
  downloadPdf(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return pdfEngine.downloadPdf(build(templateKey, data)); },
  exportCsv(templateKey: DocumentTemplateKey, data: { rows: import('@/utils/helpers').CsvRow[]; headers: string[]; fileName?: string }): DocumentActionResult {
    return exportEngine.exportCsv(data.fileName ?? templateKey, data.rows, data.headers);
  },
};