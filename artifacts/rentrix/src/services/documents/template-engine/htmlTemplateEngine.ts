import type { DocumentActionResult, DocumentRenderModel } from '../documentTypes';
import { renderSharedDocumentShell } from './sharedDocumentShell';

const popupBlockedMessage = 'تعذر فتح المعاينة. يرجى السماح بالنوافذ المنبثقة.';

const openHtml = (html: string): DocumentActionResult => {
  const popup = globalThis.open('', '_blank', 'width=1120,height=820');
  if (!popup) return { success: false, errorMessage: popupBlockedMessage };
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const cleanup = () => URL.revokeObjectURL(url);
  popup.addEventListener('load', () => {
    popup.focus();
    popup.addEventListener('beforeunload', cleanup, { once: true });
  }, { once: true });
  popup.location.replace(url);
  return { success: true };
};

export const htmlTemplateEngine = {
  renderPreviewHtml(model: DocumentRenderModel): string { return renderSharedDocumentShell(model, true); },
  renderDownloadHtml(model: DocumentRenderModel): string { return renderSharedDocumentShell(model, false); },
  preview(model: DocumentRenderModel): DocumentActionResult { return openHtml(renderSharedDocumentShell(model, true)); },
};
