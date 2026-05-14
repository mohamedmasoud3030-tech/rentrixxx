import { Building2, FileText, Home, ReceiptText, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney } from '@/lib/companyFormatters';
import { getDashboardOverview } from './dashboardService';

export function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-overview', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => getDashboardOverview(now),
  });
  const overview = dashboardQuery.data;

  const financialCards = [
    {
      title: 'إجمالي التحصيل هذا الشهر',
      value: overview ? formatCompanyMoney(defaultCompanyLocalSettings, overview.financial.total_collected) : '—',
      icon: WalletCards,
      description: 'الدفعات المحصلة',
    },
    {
      title: 'إجمالي الفواتير المتأخرة',
      value: overview ? formatCompanyMoney(defaultCompanyLocalSettings, overview.financial.total_overdue_invoices) : '—',
      icon: ReceiptText,
      description: 'فواتير متأخرة السداد',
    },
    {
      title: 'إجمالي المصروفات هذا الشهر',
      value: overview ? formatCompanyMoney(defaultCompanyLocalSettings, overview.financial.total_expenses) : '—',
      icon: Building2,
      description: 'المصاريف المسجلة',
    },
    {
      title: 'صافي الإيراد',
      value: overview ? formatCompanyMoney(defaultCompanyLocalSettings, overview.financial.net_revenue) : '—',
      icon: FileText,
      description: 'التحصيل - المصروفات',
    },
  ];

  const operationalCards = [
    {
      title: 'العقارات',
      value: overview?.operational.properties ?? '—',
      icon: Building2,
      description: 'إجمالي العقارات',
    },
    {
      title: 'الوحدات',
      value: overview?.operational.units ?? '—',
      icon: Home,
      description: 'إجمالي الوحدات',
    },
    {
      title: 'العقود النشطة',
      value: overview?.operational.activeContracts ?? '—',
      icon: FileText,
      description: 'عقود سارية المفعول',
    },
    {
      title: 'الوحدات الشاغرة',
      value: overview?.operational.vacantUnits ?? '—',
      icon: Home,
      description: 'وحدات جاهزة للتأجير',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-bold text-primary">لوحة تحكم Rentrix</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">نظرة تشغيلية ومالية على العقارات والعقود والتحصيل.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">الأرقام المعروضة تعتمد على Supabase كمصدر الحقيقة، مع تنسيق مالي مبني على إعدادات الشركة المحلية.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationalCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black" dir="ltr">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {dashboardQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>تعذر تحميل بيانات اللوحة</CardTitle>
            <CardDescription>راجع اتصال Supabase أو دالة التقرير المالي.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
