import { exportEngine } from './export/exportEngine';
import { pdfEngine } from './pdf/pdfEngine';
import { printEngine } from './print/printEngine';
import { htmlTemplateEngine } from './template-engine/htmlTemplateEngine';
import { documentRegistry } from './documentRegistry';
import type { DocumentActionResult, DocumentTemplateKey } from './documentTypes';

const build = (templateKey: DocumentTemplateKey, data: unknown) => documentRegistry[templateKey](data);

const downloadBlob = (blob: Blob, fileName: string): DocumentActionResult => {
  if (typeof document === 'undefined') {
    return { success: false, errorMessage: 'Document downloads are only available in the browser.' };
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  try {
    anchor.click();
    globalThis.setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 0);
    return { success: true };
  } catch (error) {
    URL.revokeObjectURL(url);
    anchor.remove();
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Document download failed.',
    };
  }
};

export const documentEngine = {
  previewDocument(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return printEngine.preview(build(templateKey, data)); },
  printDocument(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return printEngine.print(build(templateKey, data)); },
  downloadHtml(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult {
    const model = build(templateKey, data);
    const html = htmlTemplateEngine.renderDownloadHtml(model);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return downloadBlob(blob, `${model.fileName}.html`);
  },
  downloadPdf(templateKey: DocumentTemplateKey, data: unknown): DocumentActionResult { return pdfEngine.downloadPdf(build(templateKey, data)); },
  exportCsv(templateKey: DocumentTemplateKey, data: { rows: import('@/utils/helpers').CsvRow[]; headers: string[]; fileName?: string }): DocumentActionResult {
    return exportEngine.exportCsv(data.fileName ?? templateKey, data.rows, data.headers);
  },
};
