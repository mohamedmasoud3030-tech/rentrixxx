import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { DataErrorScreen } from '@/components/data-error-screen';
import { PageLayout } from '@/components/layout/page-layout';
import { useCompanySettingsContract } from '@/features/settings/useCompanySettings';
import { getDashboardSnapshot } from '../dashboardSnapshot';
import { HeroBanner } from './HeroBanner';
import { KpiGrid } from './KpiGrid';
import { QuickActions } from './QuickActions';
import { ExpiringContractsSection } from './ExpiringContractsSection';
import { OverdueSection } from './OverdueSection';
import { FinancialSummary } from './FinancialSummary';
import { ArrearsBreakdown } from './ArrearsBreakdown';
import { buildExpiringContracts, buildOverdueTenantRows, toDateInputValue } from './dashboard.utils';

export function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const settings = useCompanySettingsContract();
  const today = toDateInputValue(now);

  const { data: snapshot, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-snapshot', now.getMonth() + 1, now.getFullYear(), today],
    queryFn: () => getDashboardSnapshot(now),
  });

  const retryDashboard = useCallback(() => { refetch().catch(() => undefined); }, [refetch]);

  const expiringContracts = useMemo(
    () => buildExpiringContracts(snapshot?.activeContracts, now),
    [snapshot?.activeContracts, now],
  );
  const overdueRows = useMemo(
    () => buildOverdueTenantRows(snapshot?.arrears.overdueInvoices),
    [snapshot?.arrears.overdueInvoices],
  );

  return (
    <PageLayout>
      <HeroBanner snapshot={snapshot} isLoading={isLoading} settings={settings} today={today} />

      {isError && (
        <div className="space-y-3">
          <DataErrorScreen title="تعذر تحميل لوحة التحكم" error={error} />
          <Button variant="secondary" onClick={retryDashboard} className="rounded-2xl">
            إعادة المحاولة
          </Button>
        </div>
      )}

      <KpiGrid snapshot={snapshot} isLoading={isLoading} settings={settings} />
      <QuickActions />

      <div className="grid gap-5 lg:grid-cols-2">
        <ExpiringContractsSection rows={expiringContracts} isLoading={isLoading} settings={settings} />
        <OverdueSection rows={overdueRows} isLoading={isLoading} settings={settings} />
      </div>

      <FinancialSummary snapshot={snapshot} isLoading={isLoading} settings={settings} />
      <ArrearsBreakdown snapshot={snapshot} settings={settings} />
    </PageLayout>
  );
}
