import { describe, expect, it } from 'vitest';
import { collectDocumentTextChunks } from './DocumentRenderer';
import type { UnifiedDocumentModel } from './types';

const baseModel: UnifiedDocumentModel = {
  type: 'contract',
  header: { companyName: 'Rentrix', title: 'Contract' },
  kpis: [{ label: 'Tenant', value: 'John Doe' }],
  tables: [{ columns: ['Field', 'Value'], rows: [['Status', 'Active']] }],
  footer: { signatures: ['owner', 'tenant'], companyStampLabel: null, metadata: null },
  fileName: 'x',
};

describe('collectDocumentTextChunks', () => {
  it('does not inject default signature labels into Arabic detection chunks', () => {
    const chunks = collectDocumentTextChunks(baseModel);
    expect(chunks.join(' ')).not.toContain('توقيع');
  });

  it('keeps actual Arabic content in chunks', () => {
    const model: UnifiedDocumentModel = { ...baseModel, header: { ...baseModel.header, title: 'عقد إيجار' } };
    const chunks = collectDocumentTextChunks(model);
    expect(chunks.some((chunk) => /[\u0600-\u06FF]/.test(chunk))).toBe(true);
  });
});
