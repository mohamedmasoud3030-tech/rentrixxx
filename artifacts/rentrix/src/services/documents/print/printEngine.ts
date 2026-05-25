import type { DocumentActionResult, DocumentRenderModel } from '../documentTypes';
import { htmlTemplateEngine } from '../template-engine/htmlTemplateEngine';

export const printEngine = {
  preview(model: DocumentRenderModel): DocumentActionResult { return htmlTemplateEngine.preview(model); },
  print(model: DocumentRenderModel): DocumentActionResult { return htmlTemplateEngine.preview(model); },
};
