import { describe, expect, it } from 'vitest';
import { buildDashboardSummaryCards } from './dashboard-page';
import type { DashboardSnapshot } from './dashboardSnapshot';

const snapshot = {
  financial: {
    rentDue: 1200,
    collectedRent: 900,
    outstandingRent: 300,
    expenses: 125,
    netPosition: 775,
    invoicesCount: 4,
    paymentsCount: 3,
    expensesCount: 2,
  },
  operational: {
    properties: 2,
    units: 10,
    activeContracts: 7,
    expiringContracts30Days: 2,
    vacantUnits: 3,
    occupiedUnits: 7,
    occupancyRate: 70,
  },
} as DashboardSnapshot;

describe('buildDashboardSummaryCards', () => {
  it('maps dashboard snapshot metrics into summary cards with formatted money', () => {
    const cards = buildDashboardSummaryCards(snapshot, (value) => `OMR ${value ?? 0}`);

    expect(cards.map((card) => card.title)).toEqual([
      'الإيجار المستحق',
      'المحصل هذا الشهر',
      'الرصيد المتبقي',
      'المصروفات',
      'صافي المركز',
      'الإشغال',
      'تنتهي خلال 30 يوم',
    ]);
    expect(cards.map((card) => card.value)).toEqual([
      'OMR 1200',
      'OMR 900',
      'OMR 300',
      'OMR 125',
      'OMR 775',
      '70%',
      2,
    ]);
    expect(cards.filter((card) => card.isMoney)).toHaveLength(5);
  });

  it('falls back to zero metrics when the snapshot is not loaded yet', () => {
    const cards = buildDashboardSummaryCards(undefined, (value) => `OMR ${value ?? 0}`);

    expect(cards.map((card) => card.value)).toEqual([
      'OMR 0',
      'OMR 0',
      'OMR 0',
      'OMR 0',
      'OMR 0',
      '0%',
      0,
    ]);
  });
});
