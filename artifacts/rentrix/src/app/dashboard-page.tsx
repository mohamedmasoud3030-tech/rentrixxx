import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { DataErrorScreen } from '@/components/data-error-screen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompanyDate, formatCompanyMoney } from '@lib/format';
import { DashboardQuickActions } from './dashboard/DashboardQuickActions';
import { useDashboardData } from './dashboard/useDashboardData';

function DashboardErrorCard({ onRetry, error }: Readonly<{ onRetry: () => void; error: unknown }>) {
  return <div className="space-y-3"><DataErrorScreen title="تعذر تحميل بيانات لوحة التحكم" fallbackMessage="راجع الاتصال ثم أعد المحاولة." error={error} /><Button type="button" variant="secondary" onClick={onRetry}>إعادة المحاولة</Button></div>;
}

export function DashboardPage(_: Readonly<Record<string, never>>) {
  const { today, settings, dashboardQuery, retryDashboard, kpiCards, collectionTrendRows, recentInvoices, recentContracts } = useDashboardData();
  let collectionTrendContent = <div className="space-y-2">{collectionTrendRows.map((row) => <div key={row.paymentDate} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2"><span className="text-sm">{formatCompanyDate(settings, `${row.paymentDate}T00:00:00`)}</span><strong dir="ltr">{formatCompanyMoney(settings, row.totalPaid)}</strong></div>)}</div>;
  if (dashboardQuery.isLoading) {
    collectionTrendContent = <Skeleton className="h-44 w-full" />;
  } else if (collectionTrendRows.length === 0) {
    collectionTrendContent = <p className="text-sm text-muted-foreground">لا توجد دفعات خلال هذه الفترة.</p>;
  }

  let recentInvoicesContent = <div className="space-y-2">{recentInvoices.map((invoice) => <div key={invoice.invoiceId} className="flex items-center justify-between rounded-xl border p-2"><span className="text-sm">{invoice.shortInvoiceId} · {invoice.tenantName ?? 'مستأجر غير محدد'}</span><span dir="ltr" className="font-bold">{formatCompanyMoney(settings, invoice.remainingAmount)}</span></div>)}</div>;
  if (dashboardQuery.isLoading) {
    recentInvoicesContent = <Skeleton className="h-36 w-full" />;
  } else if (recentInvoices.length === 0) {
    recentInvoicesContent = <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة حالياً.</p>;
  }

  let recentContractsContent = <div className="space-y-2">{recentContracts.map((contract) => <div key={contract.id} className="flex items-center justify-between rounded-xl border p-2"><span className="text-sm">{contract.people?.full_name ?? 'مستأجر غير محدد'} · {contract.units?.unit_number ?? contract.properties?.title ?? 'وحدة غير محددة'}</span><span className="text-xs text-muted-foreground">ينتهي {formatCompanyDate(settings, `${contract.end_date}T00:00:00`)}</span></div>)}</div>;
  if (dashboardQuery.isLoading) {
    recentContractsContent = <Skeleton className="h-36 w-full" />;
  } else if (recentContracts.length === 0) {
    recentContractsContent = <p className="text-sm text-muted-foreground">لا توجد عقود نشطة في البيانات الحالية.</p>;
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border bg-card p-6"><p className="text-sm font-bold text-primary">لوحة التحكم التشغيلية</p><h2 className="mt-2 text-2xl font-black">مؤشرات العقود والتحصيل من البيانات الفعلية</h2><p className="mt-2 text-sm text-muted-foreground">حتى تاريخ {formatCompanyDate(settings, `${today}T00:00:00`)}</p></section>

    {dashboardQuery.isError ? <DashboardErrorCard onRetry={retryDashboard} error={dashboardQuery.error} /> : null}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{kpiCards.map((card) => <Card key={card.title}><CardHeader><CardTitle className="text-base">{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></CardHeader><CardContent>{dashboardQuery.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-black" dir={card.isMoney ? 'ltr' : 'rtl'}>{card.displayValue}</p>}</CardContent></Card>)}</section>

    <section className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>اتجاه التحصيل اليومي (هذا الشهر)</CardTitle><CardDescription>من تقرير التحصيل اليومي المتاح حالياً.</CardDescription></CardHeader><CardContent>{collectionTrendContent}</CardContent></Card>
      <DashboardQuickActions />
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>آخر الفواتير المتأخرة</CardTitle><CardDescription>من تقرير المتأخرات الحالي.</CardDescription></CardHeader><CardContent>{recentInvoicesContent}</CardContent></Card>
      <Card><CardHeader><CardTitle>عقود نشطة حديثة/تنتهي قريباً</CardTitle><CardDescription>من قائمة العقود النشطة الحالية.</CardDescription></CardHeader><CardContent>{recentContractsContent}<Button asChild variant="secondary" className="mt-3 w-full"><Link to="/contracts">فتح العقود</Link></Button></CardContent></Card>
    </section>
  </div>;
}
