import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompanySettingsContract } from '@/features/settings/useCompanySettings';
import { getDashboardSnapshot } from '../dashboardSnapshot';
import { buildDashboardSummaryCards } from './DashboardKpiCards';
import { buildExpiringContracts } from './ExpiringContractsTable';
import { buildOverdueTenantRows } from './OverdueTenantsTable';

const arrearsBucketOrder = ['days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'] as const;
const arrearsBucketLabels: Record<(typeof arrearsBucketOrder)[number], string> = { days_1_30: '1–30 يوم', days_31_60: '31–60 يوم', days_61_90: '61–90 يوم', days_90_plus: 'أكثر من 90 يوم' };
const toDateInputValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function useDashboardData() {
  const now = useMemo(() => new Date(), []);
  const settings = useCompanySettingsContract();
  const today = toDateInputValue(now);
  const dashboardQuery = useQuery({ queryKey: ['dashboard-snapshot', now.getMonth() + 1, now.getFullYear(), today], queryFn: () => getDashboardSnapshot(now) });
  const retryDashboard = useCallback(() => { dashboardQuery.refetch().catch(() => undefined); }, [dashboardQuery]);
  const snapshot = dashboardQuery.data;
  const expiringContracts = useMemo(() => buildExpiringContracts(snapshot?.activeContracts, now), [snapshot?.activeContracts, now]);
  const overdueTenantRows = useMemo(() => buildOverdueTenantRows(snapshot?.arrears.overdueInvoices), [snapshot?.arrears.overdueInvoices]);
  const kpiCards = useMemo(() => buildDashboardSummaryCards(snapshot, settings, dashboardQuery.isError), [snapshot, settings, dashboardQuery.isError]);
  const buckets = useMemo(() => arrearsBucketOrder.map((key) => {
    const bucket = snapshot?.arrears.agedReceivables.buckets[key];
    return { label: arrearsBucketLabels[key], total: bucket?.total ?? 0, invoiceCount: bucket?.invoiceCount ?? 0 };
  }), [snapshot?.arrears.agedReceivables.buckets]);

  return { now, today, settings, snapshot, dashboardQuery, retryDashboard, expiringContracts, overdueTenantRows, kpiCards, buckets };
}
