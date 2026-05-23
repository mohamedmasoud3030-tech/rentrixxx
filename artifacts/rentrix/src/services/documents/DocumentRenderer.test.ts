import { describe, expect, it } from 'vitest';
import { buildRtlPrintHtml } from './DocumentRenderer';
import type { UnifiedDocumentModel } from './types';

const model: UnifiedDocumentModel = {
  type: 'invoice',
  fileName: 'invoice-1',
  header: { companyName: 'شركة رنتريكس', title: 'فاتورة' },
  metadata: [{ label: 'رقم', value: 'INV-1' }],
  kpis: [{ label: 'المبلغ', value: '10.000 OMR' }],
  tables: [{ columns: ['البند', 'القيمة'], rows: [['الإجمالي', '10.000 OMR']] }],
  footer: { signatures: ['tenant'], notes: ['ملاحظة'] },
};

describe('DocumentRenderer Arabic HTML output', () => {
  it('includes arabic rtl html shell', () => {
    const html = buildRtlPrintHtml(model);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('<meta charset="utf-8"/>');
  });

  it('includes compact A4 print css', () => {
    const html = buildRtlPrintHtml(model);
    expect(html).toContain('@page{size:A4;margin:8mm 10mm}');
    expect(html).toContain('@media print');
  });
});
