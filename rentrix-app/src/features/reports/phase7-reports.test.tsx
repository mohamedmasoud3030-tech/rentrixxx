import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Phase7ReportsHubPage } from './phase7-reports-hub';
import { ReportsRouteComponent } from '@/routes/_protected.reports';
import { buildCsv, withUtf8Bom } from '@/lib/csvExport';

describe('Phase 7 operational reports dashboard, universal exporters and statements engine', () => {
  it('builds CSV and UTF8 BOM cleanly', () => {
    const rows = [{ الاسم: 'أحمد', المبلغ: 1500, الدفع: true }];
    const csv = buildCsv(rows);
    expect(csv).toContain('الاسم');
    expect(csv).toContain('1500');
    expect(withUtf8Bom(csv).charCodeAt(0)).toBe(0xFEFF);
  });

  it('renders the Phase 7 advanced reports hub from local mock data', () => {
    const html = renderToStaticMarkup(<Phase7ReportsHubPage />);
    expect(html).toContain('مركز التقارير التشغيلية المتقدمة');
    expect(html).toContain('معدل إشغال العقارات');
    expect(html).toContain('معدل تحصيل الإيجارات');
    expect(html).toContain('إجمالي المتأخرات المالية');
    expect(html).toContain('تصدير تقرير المتأخرات CSV');
    expect(html).toContain('طباعة كشوف الحسابات المالية');
  });

  it('wires Phase 7 reports hub into protected reports route', () => {
    expect(ReportsRouteComponent).toBe(Phase7ReportsHubPage);
  });
});
