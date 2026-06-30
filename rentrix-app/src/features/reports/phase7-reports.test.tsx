import { describe, expect, it } from 'vitest';
import { buildCsv, withUtf8Bom } from '@/lib/csvExport';
import { ReportsPage } from './reports-page';
import { ReportsRouteComponent } from '@/routes/_protected.reports';

describe('reports route wiring', () => {
  it('ReportsRouteComponent points to ReportsPage (Supabase-backed)', () => {
    expect(ReportsRouteComponent).toBe(ReportsPage);
  });
});

describe('CSV export utility', () => {
  it('builds CSV with correct headers and values', () => {
    const rows = [{ الاسم: 'أحمد', المبلغ: 1500, الدفع: true }];
    const csv = buildCsv(rows);
    expect(csv).toContain('الاسم');
    expect(csv).toContain('1500');
  });

  it('withUtf8Bom prepends BOM character for Excel compatibility', () => {
    const csv = buildCsv([{ a: 1 }]);
    expect(withUtf8Bom(csv).charCodeAt(0)).toBe(0xFEFF);
  });
});
