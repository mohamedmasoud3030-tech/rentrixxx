import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Banknote, Building2, CalendarClock, FileText, Home, ReceiptText, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDefaultCompanyMoney } from '@/lib/companyFormatters';
import { cn } from '@/lib/utils';
import { useContracts } from '@/features/contracts/useContracts';
import type { ContractListItem } from '@/features/contracts/services/contractService';
import {
  useAgedReceivablesReport,
  useArrearsSummaryReport,
  useFinancialPeriodSummaryReport,
  useOverdueInvoicesReport,
} from '@/features/financials/reports/useFinancialReports';
import { getDashboardOverview } from './dashboardService';

const dashboardWindowDays = 30;
const maxExpiringContracts = 5;

const quickActions = [
  { label: 'إنشاء عقد', to: '/contracts/new', icon: FileText },
  { label: 'الفواتير', to: '/invoices', icon: ReceiptText },
  { label: 'المتأخرات', to: '/arrears', icon: AlertTriangle },
  { label: 'المالية', to: '/financials', icon: WalletCards },
  { label: 'التقارير', to: '/reports', icon: Banknote },
] as const;

const arrearsBucketOrder = ['days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'] as const;
const arrearsBucketLabels: Record<(typeof arrearsBucketOrder)[number], string> = {
  days_1_30: '1–30 يوم',
  days_31_60: '31–60 يوم',
  days_61_90: '61–90 يوم',
  days_90_plus: 'أكثر من 90 يوم',
};

type KpiCard = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: string;
  isMoney?: boolean;
};

type ExpiringContractRow = {
  id: string;
  contractNumber: string;
  tenantName: string;
  location: string;
  endDate: string;
  daysRemaining: number;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function calculateDaysRemaining(endDate: string, today: Date) {
  const todayTimestamp = Date.parse(`${toDateInputValue(today)}T00:00:00.000Z`);
  const endTimestamp = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(todayTimestamp) || !Number.isFinite(endTimestamp)) return 0;
  return Math.max(0, Math.ceil((endTimestamp - todayTimestamp) / (24 * 60 * 60 * 1000)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatMoney(value: number) {
  return formatDefaultCompanyMoney(value);
}

function getContractLocation(contract: ContractListItem) {
  const propertyTitle = contract.properties?.title ?? 'عقار غير محدد';
  const unitNumber = contract.units?.unit_number;
  return unitNumber ? `${propertyTitle} / وحدة ${unitNumber}` : propertyTitle;
}

function buildExpiringContracts(contracts: ContractListItem[] | undefined, today: Date) {
  const todayValue = toDateInputValue(today);
  const windowEnd = toDateInputValue(addDays(today, dashboardWindowDays));

  return (contracts ?? [])
    .filter((contract) => contract.end_date >= todayValue && contract.end_date <= windowEnd)
    .map<ExpiringContractRow>((contract) => ({
      id: contract.id,
      contractNumber: contract.id.slice(0, 8),
      tenantName: contract.people?.full_name ?? 'مستأجر غير محدد',
      location: getContractLocation(contract),
      endDate: contract.end_date,
      daysRemaining: calculateDaysRemaining(contract.end_date, today),
    }))
    .sort((first, second) => first.daysRemaining - second.daysRemaining || first.contractNumber.localeCompare(second.contractNumber, 'ar'))
    .slice(0, maxExpiringContracts);
}

function KpiGrid({ cards, isLoading }: Readonly<{ cards: KpiCard[]; isLoading: boolean }>) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
              <div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm', card.tone)}>
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-black" dir={card.isMoney ? 'ltr' : 'rtl'}>{card.value}</p>}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function ExpiringContractsPanel({ rows, isLoading }: Readonly<{ rows: ExpiringContractRow[]; isLoading: boolean }>) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>العقود التي تنتهي قريبًا</CardTitle>
          <CardDescription>عقود نشطة ينتهي تاريخها خلال {dashboardWindowDays} يومًا.</CardDescription>
        </div>
        <StatusBadge tone="gold">{rows.length} عقود</StatusBadge>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-52 w-full" /> : null}
        {!isLoading && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">
            لا توجد عقود نشطة تنتهي خلال 30 يومًا.
          </div>
        ) : null}
        {!isLoading && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>اسم المستأجر</TableHead>
                  <TableHead>الوحدة/العقار</TableHead>
                  <TableHead>تاريخ النهاية</TableHead>
                  <TableHead>الأيام المتبقية</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-black" dir="ltr">#{row.contractNumber}</TableCell>
                    <TableCell>{row.tenantName}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell>{formatDate(row.endDate)}</TableCell>
                    <TableCell><StatusBadge tone={row.daysRemaining <= 7 ? 'red' : 'gold'}>{row.daysRemaining} يوم</StatusBadge></TableCell>
                    <TableCell>
                      <Button asChild variant="secondary" className="min-h-9 px-3">
                        <Link to="/contracts/$contractId" params={{ contractId: row.id }}>
                          فتح
                          <ArrowLeft className="mr-2 size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ArrearsPanel({
  totalOverdue,
  overdueInvoiceCount,
  averageDaysOverdue,
  buckets,
  isLoading,
}: Readonly<{
  totalOverdue: number;
  overdueInvoiceCount: number;
  averageDaysOverdue: number;
  buckets: { label: string; total: number; invoiceCount: number }[];
  isLoading: boolean;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>المتأخرات والتحصيل</CardTitle>
        <CardDescription>ملخص فواتير متأخرة حسب أعمار الذمم المتاحة من التقارير الحالية.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? <Skeleton className="h-56 w-full" /> : null}
        {!isLoading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs font-black text-muted-foreground">إجمالي المتأخرات</p>
                <p className="mt-2 text-xl font-black" dir="ltr">{formatMoney(totalOverdue)}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs font-black text-muted-foreground">فواتير متأخرة</p>
                <p className="mt-2 text-xl font-black">{overdueInvoiceCount}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-black">Aging buckets</p>
                <StatusBadge tone="gray">متوسط {Math.round(averageDaysOverdue)} يوم</StatusBadge>
              </div>
              <div className="space-y-3">
                {buckets.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
                    <span className="text-sm font-bold text-muted-foreground">{bucket.label}</span>
                    <span className="text-sm font-black" dir="ltr">{formatMoney(bucket.total)} · {bucket.invoiceCount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary"><Link to="/arrears">فتح المتأخرات</Link></Button>
              <Button asChild variant="secondary"><Link to="/invoices">فتح الفواتير</Link></Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuickActionsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>إجراءات سريعة</CardTitle>
        <CardDescription>اختصارات للعمليات اليومية الأكثر استخدامًا.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.to} asChild variant="secondary" className="justify-between">
              <Link to={action.to}>
                <span className="inline-flex items-center gap-2"><Icon className="size-4" />{action.label}</span>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const today = toDateInputValue(now);
  const monthStart = useMemo(() => toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)), [now]);
  const periodFilters = useMemo(() => ({ dateFrom: monthStart, dateTo: today }), [monthStart, today]);
  const arrearsFilters = useMemo(() => ({ asOf: today }), [today]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-overview', now.getMonth() + 1, now.getFullYear(), today],
    queryFn: () => getDashboardOverview(now),
  });
  const activeContractsQuery = useContracts({ status: 'active' });
  const periodSummaryQuery = useFinancialPeriodSummaryReport(periodFilters);
  const overdueInvoicesQuery = useOverdueInvoicesReport(arrearsFilters);
  const arrearsSummaryQuery = useArrearsSummaryReport(arrearsFilters);
  const agedReceivablesQuery = useAgedReceivablesReport(arrearsFilters);

  const overview = dashboardQuery.data;
  const expiringContracts = useMemo(() => buildExpiringContracts(activeContractsQuery.data, now), [activeContractsQuery.data, now]);
  const activeContractsCount = activeContractsQuery.data?.length ?? overview?.operational.activeContracts ?? 0;
  const monthlyCollection = periodSummaryQuery.data?.paid ?? overview?.financial.total_collected ?? 0;
  const overdueAmount = overdueInvoicesQuery.data?.totalOverdue ?? overview?.financial.total_overdue_invoices ?? 0;
  const overdueInvoiceCount = overdueInvoicesQuery.data?.invoiceCount ?? overview?.operational.overdueInvoices ?? 0;

  const kpiCards: KpiCard[] = [
    {
      title: 'إجمالي العقارات',
      value: overview?.operational.properties ?? '—',
      icon: Building2,
      description: 'العقارات غير المؤرشفة',
      tone: 'bg-sky-600',
    },
    {
      title: 'إجمالي الوحدات',
      value: overview?.operational.units ?? '—',
      icon: Home,
      description: 'الوحدات المسجلة',
      tone: 'bg-cyan-600',
    },
    {
      title: 'العقود النشطة',
      value: activeContractsCount,
      icon: FileText,
      description: 'عقود سارية المفعول',
      tone: 'bg-emerald-600',
    },
    {
      title: 'تنتهي خلال 30 يوم',
      value: overview?.operational.expiringContracts30Days ?? expiringContracts.length,
      icon: CalendarClock,
      description: 'عقود تحتاج متابعة',
      tone: 'bg-amber-600',
    },
    {
      title: 'الفواتير المتأخرة',
      value: overdueInvoiceCount,
      icon: AlertTriangle,
      description: formatMoney(overdueAmount),
      tone: 'bg-rose-600',
    },
    {
      title: 'تحصيل الشهر',
      value: formatMoney(monthlyCollection),
      icon: WalletCards,
      description: 'دفعات محصلة هذا الشهر',
      tone: 'bg-indigo-600',
      isMoney: true,
    },
  ];

  const buckets = arrearsBucketOrder.map((key) => {
    const bucket = agedReceivablesQuery.data?.buckets[key];
    return {
      label: arrearsBucketLabels[key],
      total: bucket?.total ?? 0,
      invoiceCount: bucket?.invoiceCount ?? 0,
    };
  });

  const isKpiLoading = dashboardQuery.isLoading || activeContractsQuery.isLoading || periodSummaryQuery.isLoading || overdueInvoicesQuery.isLoading;
  const isArrearsLoading = overdueInvoicesQuery.isLoading || arrearsSummaryQuery.isLoading || agedReceivablesQuery.isLoading;
  const hasDashboardError = dashboardQuery.isError || activeContractsQuery.isError || periodSummaryQuery.isError || overdueInvoicesQuery.isError || arrearsSummaryQuery.isError || agedReceivablesQuery.isError;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-bold text-primary">لوحة تحكم Rentrix التشغيلية</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight">مركز متابعة العقارات والعقود والتحصيل من البيانات الحالية.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              تعرض اللوحة مؤشرات تشغيلية حقيقية من خدمات Supabase والتقارير الحالية بدون إضافة SQL أو RPCs أو مصادر legacy.
            </p>
          </div>
          <div className="rounded-3xl bg-primary/10 p-5 text-primary">
            <p className="text-xs font-black text-muted-foreground">حتى تاريخ</p>
            <p className="mt-2 text-2xl font-black">{formatDate(today)}</p>
          </div>
        </div>
      </section>

      <KpiGrid cards={kpiCards} isLoading={isKpiLoading} />

      <section className="grid gap-4 xl:grid-cols-3">
        <ExpiringContractsPanel rows={expiringContracts} isLoading={activeContractsQuery.isLoading} />
        <QuickActionsPanel />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ArrearsPanel
          totalOverdue={overdueAmount}
          overdueInvoiceCount={overdueInvoiceCount}
          averageDaysOverdue={arrearsSummaryQuery.data?.averageDaysOverdue ?? 0}
          buckets={buckets}
          isLoading={isArrearsLoading}
        />
        <Card>
          <CardHeader>
            <CardTitle>نظرة مالية للشهر</CardTitle>
            <CardDescription>ملخص يعتمد على تقرير الفترة المالية الحالي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {periodSummaryQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}
            {!periodSummaryQuery.isLoading ? (
              <>
                <div className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold text-muted-foreground">المفوتر</span><span className="font-black" dir="ltr">{formatMoney(periodSummaryQuery.data?.invoiced ?? 0)}</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold text-muted-foreground">المحصل</span><span className="font-black" dir="ltr">{formatMoney(monthlyCollection)}</span></div>
                <div className="flex items-center justify-between rounded-2xl bg-muted p-4"><span className="font-bold text-muted-foreground">المتبقي</span><span className="font-black" dir="ltr">{formatMoney(periodSummaryQuery.data?.outstanding ?? 0)}</span></div>
                <Button asChild className="w-full"><Link to="/financials">فتح المالية</Link></Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {hasDashboardError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle>تعذر تحميل جزء من بيانات اللوحة</CardTitle>
            <CardDescription>راجع اتصال Supabase أو صلاحيات التقارير الحالية. ستظل الروابط والبيانات المحملة متاحة.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}