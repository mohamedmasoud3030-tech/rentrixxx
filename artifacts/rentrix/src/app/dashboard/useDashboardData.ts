import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompanySettingsContract } from '@/features/settings/useCompanySettings';
import { getDailyCollectionReport, type DailyCollectionReportRow, type OverdueInvoiceReportRow } from '@/features/financials/reports/financialReportsService';
import { formatCompanyMoney } from '@/lib/format';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { getDashboardSnapshot } from '../dashboardSnapshot';

const toDateInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

type DashboardKpiCard = Readonly<{
  title: string;
  value: number;
  displayValue: string | number;
  description: string;
  isMoney?: boolean;
}>;

type DashboardKpiInput = Readonly<{
  activeContracts: number;
  expiring30: number;
  expiring90: number;
  totalOverdue: number;
  expectedMonthlyRent: number;
  collectedRent: number;
}>;

export function buildDashboardKpiCards(input: DashboardKpiInput, settings: CompanySettingsContract): DashboardKpiCard[] {
  return [
    { title: 'العقود النشطة', value: input.activeContracts, displayValue: input.activeContracts, description: 'من قائمة العقود النشطة الحالية' },
    { title: 'تنتهي خلال 30 يوم', value: input.expiring30, displayValue: input.expiring30, description: 'مؤشر تجديد عاجل' },
    { title: 'تنتهي خلال 90 يوم', value: input.expiring90, displayValue: input.expiring90, description: 'مؤشر المتابعة الربع سنوية' },
    { title: 'إجمالي المتأخرات', value: input.totalOverdue, displayValue: formatCompanyMoney(settings, input.totalOverdue), description: 'مجموع الفواتير المتأخرة', isMoney: true },
    { title: 'الإيجار الشهري المتوقع', value: input.expectedMonthlyRent, displayValue: formatCompanyMoney(settings, input.expectedMonthlyRent), description: 'تجميع إيجارات العقود النشطة', isMoney: true },
    { title: 'المحصل هذا الشهر', value: input.collectedRent, displayValue: formatCompanyMoney(settings, input.collectedRent), description: 'من تقرير الفترة المالية', isMoney: true },
  ];
}

export function useDashboardData() {
  const now = useMemo(() => new Date(), []);
  const settings = useCompanySettingsContract();
  const today = toDateInputValue(now);
  const monthStart = toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));

  const dashboardQuery = useQuery({ queryKey: ['dashboard-snapshot', now.getMonth() + 1, now.getFullYear(), today], queryFn: () => getDashboardSnapshot(now) });
  const dailyCollectionQuery = useQuery({ queryKey: ['dashboard-daily-collections', monthStart, today], queryFn: () => getDailyCollectionReport({ dateFrom: monthStart, dateTo: today }) });

  const retryDashboard = useCallback(() => {
    dashboardQuery.refetch().catch(() => undefined);
    dailyCollectionQuery.refetch().catch(() => undefined);
  }, [dashboardQuery, dailyCollectionQuery]);

  const snapshot = dashboardQuery.data;
  const expiring30 = snapshot?.operational.expiringContracts30Days ?? 0;
  const expiring90 = snapshot?.activeContracts.filter((contract) => {
    const end = new Date(`${contract.end_date}T00:00:00`).getTime();
    const diff = Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 90;
  }).length ?? 0;
  const expectedMonthlyRent = snapshot?.activeContracts.reduce((sum, contract) => sum + contract.rent_amount, 0) ?? 0;

  const kpiCards = buildDashboardKpiCards({
    activeContracts: snapshot?.operational.activeContracts ?? 0,
    expiring30,
    expiring90,
    totalOverdue: snapshot?.arrears.totalOverdue ?? 0,
    expectedMonthlyRent,
    collectedRent: snapshot?.financial.collectedRent ?? 0,
  }, settings);

  const collectionTrendRows: DailyCollectionReportRow[] = dailyCollectionQuery.data?.rows ?? [];
  const recentInvoices: OverdueInvoiceReportRow[] = (snapshot?.arrears.overdueInvoices ?? []).slice(0, 6);
  const recentContracts = (snapshot?.activeContracts ?? []).slice().sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 6);

  return { now, today, settings, snapshot, dashboardQuery, retryDashboard, kpiCards, collectionTrendRows, recentInvoices, recentContracts };
}
