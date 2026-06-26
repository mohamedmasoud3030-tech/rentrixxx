import { AlertTriangle, Building2, CalendarClock, Home } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import type { CompanySettingsContract } from '@/lib/companySettings';
import type { DashboardSnapshot } from '../dashboardSnapshot';

const WINDOW_DAYS = 30;

interface KpiGridProps {
  snapshot: DashboardSnapshot | undefined;
  isLoading: boolean;
  settings: CompanySettingsContract;
}

export function KpiGrid({ snapshot, isLoading, settings }: KpiGridProps) {
  const money = (v: number | null | undefined) => formatCompanyMoney(settings, v);

  const items = [
    {
      label: 'عقارات',
      value: snapshot?.operational.properties ?? 0,
      icon: Building2,
      accent: 'sky' as const,
      sub: `${snapshot?.operational.units ?? 0} وحدة إجمالاً`,
    },
    {
      label: 'نسبة الإشغال',
      value: `${snapshot?.operational.occupancyRate ?? 0}%`,
      icon: Home,
      accent: 'emerald' as const,
      sub: `${snapshot?.operational.occupiedUnits ?? 0} مشغولة`,
      trend: (snapshot?.operational.occupancyRate ?? 0) >= 80 ? 'up' as const : 'neutral' as const,
      trendValue: `${snapshot?.operational.occupancyRate ?? 0}%`,
    },
    {
      label: 'المتأخرات',
      value: money(snapshot?.arrears.totalOverdue ?? 0),
      icon: AlertTriangle,
      accent: (snapshot?.arrears.totalOverdue ?? 0) > 0 ? 'rose' as const : 'emerald' as const,
      sub: `${snapshot?.arrears.overdueInvoiceCount ?? 0} فاتورة`,
      trend: (snapshot?.arrears.totalOverdue ?? 0) > 0 ? 'down' as const : 'neutral' as const,
    },
    {
      label: 'عقود تنتهي قريباً',
      value: snapshot?.operational.expiringContracts30Days ?? 0,
      icon: CalendarClock,
      accent: (snapshot?.operational.expiringContracts30Days ?? 0) > 0 ? 'amber' as const : 'emerald' as const,
      sub: `خلال ${WINDOW_DAYS} يوم`,
      trend: (snapshot?.operational.expiringContracts30Days ?? 0) > 0 ? 'down' as const : 'neutral' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) =>
        isLoading
          ? <Skeleton key={item.label} className="h-28 rounded-2xl" />
          : <KpiCard key={item.label} {...item} />,
      )}
    </div>
  );
}
