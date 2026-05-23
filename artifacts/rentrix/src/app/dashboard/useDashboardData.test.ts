import { describe, expect, it } from 'vitest';
import { buildDashboardKpiCards } from './useDashboardData';
import { defaultCompanySettingsContract } from '@/lib/companySettings';

describe('buildDashboardKpiCards', () => {
  it('formats only money KPIs with company currency', () => {
    const cards = buildDashboardKpiCards({
      activeContracts: 12,
      expiring30: 1,
      expiring90: 4,
      totalOverdue: 12345.67,
      expectedMonthlyRent: 9876.5,
      collectedRent: 1500,
    }, defaultCompanySettingsContract);

    expect(cards.filter((card) => card.isMoney).map((card) => card.title)).toEqual([
      'إجمالي المتأخرات',
      'الإيجار الشهري المتوقع',
      'المحصل هذا الشهر',
    ]);
    expect(cards.filter((card) => card.isMoney).every((card) => typeof card.displayValue === 'string')).toBe(true);
    expect(cards.find((card) => card.title === 'إجمالي المتأخرات')?.displayValue).toBe('‏١٢٬٣٤٥٫٦٧٠ OMR');
  });

  it('keeps count KPIs as numbers and preserves zero handling', () => {
    const cards = buildDashboardKpiCards({
      activeContracts: 0,
      expiring30: 0,
      expiring90: 0,
      totalOverdue: 0,
      expectedMonthlyRent: 0,
      collectedRent: 0,
    }, defaultCompanySettingsContract);

    expect(cards.filter((card) => !card.isMoney).map((card) => card.displayValue)).toEqual([0, 0, 0]);
    expect(cards.filter((card) => card.isMoney).map((card) => card.displayValue)).toEqual([
      '‏٠٫٠٠٠ OMR',
      '‏٠٫٠٠٠ OMR',
      '‏٠٫٠٠٠ OMR',
    ]);
  });
});
