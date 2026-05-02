import { documentEngine } from './DocumentEngine';
import { DocumentRenderer } from './DocumentRenderer';
import type { DocumentRequest } from './types';
import { AuditTrail } from '@/services/audit/AuditTrail';

export const DocumentController = {
  async renderToPDF(request: DocumentRequest): Promise<void> {
    const model = documentEngine.build(request);
    DocumentRenderer.renderToPDF(model);
    await AuditTrail.log({
      action: 'EXPORT_PDF',
      entityType: 'DOCUMENT',
      entityId: model.fileName,
      after: {
        type: model.type,
        fileName: model.fileName,
        title: model.header.title,
      },
    });
  },
};
