import { Link } from '@tanstack/react-router';
import { WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import type { CompanySettingsContract } from '@/lib/companySettings';
import type { DashboardSnapshot } from '../dashboardSnapshot';

interface FinancialSummaryProps {
  snapshot: DashboardSnapshot | undefined;
  isLoading: boolean;
  settings: CompanySettingsContract;
}

export function FinancialSummary({ snapshot, isLoading, settings }: FinancialSummaryProps) {
  const money = (v: number | null | undefined) => formatCompanyMoney(settings, v);

  const items = [
    { label: 'المفوتر',                value: snapshot?.financial.rentDue,         tone: 'default'  as const },
    { label: 'المحصّل',                value: snapshot?.financial.collectedRent,    tone: 'success'  as const },
    { label: 'المتبقي',                value: snapshot?.financial.outstandingRent,  tone: 'warning'  as const },
    { label: 'المحصل بعد المصروفات',   value: snapshot?.financial.netPosition,      tone: 'info'     as const },
  ];

  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">النظرة المالية للشهر</CardTitle>
          <Link to="/financials">
            <Button variant="secondary" className="h-7 rounded-xl text-xs px-3 gap-1">
              <WalletCards className="size-3" /> المالية
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading
          ? <Skeleton className="h-28 rounded-2xl" />
          : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {items.map((item) => (
                <StatCard
                  key={item.label}
                  label={item.label}
                  value={money(item.value ?? 0)}
                  tone={item.tone}
                />
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
