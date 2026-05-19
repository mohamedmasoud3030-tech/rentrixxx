import { describe, expect, it } from 'vitest';
import { modelHasArabicText } from './DocumentRenderer';
import type { UnifiedDocumentModel } from './types';

function buildModel(title: string): UnifiedDocumentModel {
  return {
    type: 'invoice',
    header: { companyName: 'Rentrix', title },
    kpis: [{ label: 'Tenant', value: 'Ahmad' }],
    tables: [{ columns: ['Field'], rows: [['Value']] }],
    footer: { signatures: ['tenant'] },
    fileName: 'doc',
  };
}

describe('modelHasArabicText', () => {
  it('detects Arabic characters', () => {
    expect(modelHasArabicText(buildModel('فاتورة إيجار'))).toBe(true);
  });

  it('returns false for latin-only text', () => {
    expect(modelHasArabicText(buildModel('Invoice'))).toBe(false);
  });
});
