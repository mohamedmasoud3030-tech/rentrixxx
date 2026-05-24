import { describe, expect, it } from 'vitest';

import { buildOperationalPrintHtml, runOperationalPrint } from './operationalPrint';

describe('operational print helper HTML contract', () => {
  it('renders Arabic RTL shell with UTF-8 metadata', () => {
    const html = buildOperationalPrintHtml({
      title: 'تقرير تشغيلي',
      generatedAt: '2026-05-24 10:00',
      summaryItems: [{ label: 'الوحدات', value: '5' }],
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<meta charset="utf-8"');
  });

  it('includes compact A4 print CSS markers', () => {
    const html = buildOperationalPrintHtml({
      title: 'تقرير تشغيلي',
      generatedAt: '2026-05-24 10:00',
      summaryItems: [{ label: 'الوحدات', value: '5' }],
    });

    expect(html).toContain('@page');
    expect(html).toContain('size:A4');
    expect(html).toContain('margin:8mm 10mm');
  });

  it('blocks printing when operational data is empty', () => {
    expect(runOperationalPrint(false, false, false)).toBe('لا توجد بيانات تشغيلية متاحة للطباعة حالياً.');
  });

  it('does not emit forbidden owner/office financial labels', () => {
    const html = buildOperationalPrintHtml({
      title: 'تقرير تشغيلي',
      generatedAt: '2026-05-24 10:00',
      summaryItems: [{ label: 'الوحدات', value: '5' }],
      tables: [{
        title: 'جدول تشغيلي',
        columns: ['المؤشر', 'القيمة'],
        rows: [['نسبة الإشغال', '95%']],
      }],
    });

    const forbiddenLabels = [
      'مستحقات المالك النهائية',
      'عمولة المكتب',
      'ربح المكتب',
      'توزيع التحصيلات',
      'كشف حساب المالك النهائي',
    ];

    for (const label of forbiddenLabels) {
      expect(html).not.toContain(label);
    }
  });

  it('escapes user-provided content and prevents raw HTML/script injection', () => {
    const injection = '<img src=x onerror=alert(1)><script>alert(1)</script>';
    const html = buildOperationalPrintHtml({
      title: injection,
      generatedAt: injection,
      summaryItems: [{ label: injection, value: injection }],
      tables: [{
        title: injection,
        columns: [injection],
        rows: [[injection]],
      }],
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
