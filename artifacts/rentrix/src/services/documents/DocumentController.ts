import { documentEngine } from './DocumentEngine';
import { DocumentRenderer } from './DocumentRenderer';
import type { DocumentRequest } from './types';

export const DocumentController = {
  async renderToPDF(request: DocumentRequest): Promise<void> {
    const model = documentEngine.build(request);
    DocumentRenderer.renderToPDF(model);
  },
};
