import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpLeft, BarChart3, Building2, CalendarClock, ClipboardList, FileSpreadsheet, Inbox, RefreshCcw, WalletCards, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useContracts } from '@/features/contracts/useContracts';
import type { ContractListItem } from '@/features/contracts/services/contractService';
import { formatDate, formatInvoiceStatusLabel, formatMoney, formatShortId, getErrorMessage } from '@/features/financials/components/financials-formatters';
import { useReceipts } from '@/features/financials/receipts/useReceipts';
import {
  type AgedReceivablesBucket,
  type DailyCollectionReportRow,
  type OverdueInvoiceReportRow,
} from '@/features/financials/reports/financialReportsService';
import {
  useAgedReceivablesReport,
  useDailyCollectionReport,
  useExpenseBreakdownReport,
  useFinancialCashflowReport,
  useFinancialPeriodSummaryReport,
  useOverdueInvoicesReport,
} from '@/features/financials/reports/useFinancialReports';
import { useAllUnits } from '@/features/units/use-units';
import { buildCsv, withUtf8Bom, type CsvRow } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import { buildAgingBucketChartRows, buildOccupancyRows, buildPaymentsTrendRows, buildRentRollRows, createReceiptPrintHref } from './reports-page.helpers';
import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/types/domain';

export { escapeCsvValue } from '@/lib/csvExport';

type FilterState = Readonly<{ from: string; to: string; asOf: string }>;
type ReportCardProps = Readonly<{ id?: string; title: string; description: string; children: React.ReactNode; action?: React.ReactNode; isLoading?: boolean }>;

type RentRollRow = ReturnType<typeof buildRentRollRows>[number];

type SafeLinkProps = Readonly<{
  href: string;
  label: string;
}>;

const latestReceiptLimit = 100;
const expiringContractWindowDays = 60;
const agingBucketKeys: Array<AgedReceivablesBucket['key']> = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'];
const contractStatusLabels: Record<ContractListItem['status'], string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'منهى',
};

// ── Section definitions ───────────────────────────────────────────────────────
//
// Each section is anchored by id and answers one specific business question.
// The nav between them is a horizontal pill row on mobile and an in-page
// section nav on desktop. The "كشوف الحساب" section intentionally uses the
// honest terms كشف حساب المستأجر / ملخص حركة المالك / ملخص حركة المكتب —
// never ledger, final settlement, payout readiness, or accounting finality.
const reportSections = [
  { id: 'overview',      label: 'نظرة عامة',         icon: BarChart3      },
  { id: 'collections',   label: 'التحصيلات',         icon: WalletCards    },
  { id: 'overdue',       label: 'المتأخرات',         icon: AlertTriangle  },
  { id: 'expenses',      label: 'المصروفات',         icon: ClipboardList  },
  { id: 'occupancy',     label: 'الإشغال والعقود',   icon: Building2      },
  { id: 'statements',    label: 'كشوف الحساب',       icon: FileSpreadsheet },
  { id: 'metrics',       label: 'المؤشرات الرئيسية',  icon: BarChart3      },
] as const;

type ReportSectionId = (typeof reportSections)[number]['id'];

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayLocalDateString() {
  return toDateInputValue(new Date());
}

export function buildReportCsvFilename(reportSlug: string) {
  return `${reportSlug}-${getTodayLocalDateString()}.csv`;
}

function getCurrentMonthFilters(): FilterState {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayValue = getTodayLocalDateString();

  return {
    from: toDateInputValue(firstDay),
    to: todayValue,
    asOf: todayValue,
  };
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const blob = new Blob([withUtf8Bom(buildCsv(rows))], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function isWithinDateRange(value: string, filters: FilterState) {
  return value >= filters.from && value <= filters.to;
}

function toFinancialSummaryCsv(summary: Readonly<{ invoiced: number; paid: number; outstanding: number; expenses: number; netCash: number }>): CsvRow[] {
  return [
    { metric: 'invoiced', amount: summary.invoiced },
    { metric: 'paid', amount: summary.paid },
    { metric: 'outstanding', amount: summary.outstanding },
    { metric: 'expenses', amount: summary.expenses },
    { metric: 'netCash', amount: summary.netCash },
  ];
}

function toDailyCollectionCsv(rows: DailyCollectionReportRow[]): CsvRow[] {
  return rows.map((row) => ({
    paymentDate: row.paymentDate,
    totalPaid: row.totalPaid,
    paymentsCount: row.paymentsCount,
    cash: row.methodTotals.cash,
    bankTransfer: row.methodTotals.bank_transfer,
    card: row.methodTotals.card,
    check: row.methodTotals.check,
    other: row.methodTotals.other,
  }));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateOnlyTimestamp(value: string) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function buildExpiringContractsRows(contracts: ContractListItem[], fromDate: Date) {
  const todayValue = toDateInputValue(fromDate);
  const cutoffValue = toDateInputValue(addDays(fromDate, expiringContractWindowDays));

  return contracts
    .filter((contract) => contract.status === 'active' && contract.end_date >= todayValue && contract.end_date <= cutoffValue)
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
    .slice(0, 12)
    .map((contract) => ({
      contractId: contract.id,
      tenantName: contract.people?.full_name ?? '—',
      propertyTitle: contract.properties?.title ?? '—',
      unitNumber: contract.units?.unit_number ?? '—',
      endDate: contract.end_date,
      daysRemaining: Math.max(0, Math.ceil((toDateOnlyTimestamp(contract.end_date) - toDateOnlyTimestamp(todayValue)) / (24 * 60 * 60 * 1000))),
    }));
}

function SafeAnchor({ href, label }: SafeLinkProps) {
  return (
    <a className="inline-flex items-center gap-1 font-black text-primary hover:underline" href={href}>
      {label}
      <ArrowUpLeft className="size-3" />
    </a>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 p-4" role="status" aria-live="polite" aria-label="جارٍ تحميل هذا التقرير">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

function ReportCard({ id, title, description, action, children, isLoading = false }: ReportCardProps) {
  return (
    <Card id={id} className="scroll-mt-28 overflow-hidden border-border/60">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <CardTitle className="text-sm font-black">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isLoading ? null : action}
      </CardHeader>
      <CardContent className="p-0">{isLoading ? <SectionSkeleton /> : children}</CardContent>
    </Card>
  );
}

function ReportsHero({ summary, today, isLoading }: Readonly<{
  summary: NonNullable<ReturnType<typeof useFinancialPeriodSummaryReport>['data']> | undefined;
  today: string;
  isLoading: boolean;
}>) {
  const invoiced = summary?.invoiced ?? 0;
  const paid = summary?.paid ?? 0;
  const outstanding = summary?.outstanding ?? 0;
  const expenses = summary?.expenses ?? 0;
  const netCash = summary?.netCash ?? 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-8 -top-8 size-40 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-4 size-32 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-300">
              <BarChart3 className="size-4 text-primary" />
              مركز التقارير والكشوف
            </p>
            <h1 className="mt-0.5 text-xl font-black sm:text-2xl">مركز التقارير</h1>
          </div>
          <StatusBadge tone="blue">{today}</StatusBadge>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <div>
            {isLoading ? (
              <Skeleton className="h-10 w-32 bg-white/10" />
            ) : (
              <p className="text-3xl font-black tabular-nums sm:text-4xl" dir="ltr">{formatMoney(paid)}</p>
            )}
            <p className="text-xs font-semibold text-slate-400">المحصل للفترة المحددة</p>
          </div>
          <div aria-hidden="true" className="mb-1 ms-4 h-10 w-px bg-white/20" />
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-20 bg-white/10" />
            ) : (
              <p className="text-lg font-black" dir="ltr">{formatMoney(outstanding)}</p>
            )}
            <p className="text-xs font-semibold text-slate-400">الرصيد المستحق</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
          <span className="rounded-full bg-white/10 px-3 py-1.5">قراءة فقط</span>
          <span className={cn('rounded-full px-3 py-1.5', netCash >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300')}>
            صافي الحركة {formatMoney(netCash)}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">
            فواتير {formatMoney(invoiced)} · مصروفات {formatMoney(expenses)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FiltersPanel({ filters, onChange, onResetCurrentMonth }: Readonly<{
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onResetCurrentMonth: () => void;
}>) {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">فلترة الفترة</p>
            <CardDescription>حدد من/إلى لاحتساب الفترة، وتاريخ "الاحتساب" لحساب المتأخرات وأعمار الذمم.</CardDescription>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="space-y-1 text-sm font-bold">
            <span>من تاريخ</span>
            <Input type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>إلى تاريخ</span>
            <Input type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>تاريخ الاحتساب (As of)</span>
            <Input type="date" value={filters.asOf} onChange={(event) => onChange({ ...filters, asOf: event.target.value })} />
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={onResetCurrentMonth} variant="secondary"><RefreshCcw className="ml-2 size-4" />الشهر الحالي</Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function SectionNav({ activeId, onJump }: Readonly<{ activeId: ReportSectionId; onJump: (id: ReportSectionId) => void }>) {
  return (
    <nav aria-label="أقسام التقارير" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {reportSections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onJump(section.id)}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-black transition',
              isActive
                ? 'border-primary/40 bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            <section.icon className="size-3.5" />
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}

// ── Overview section: نظرة عامة ───────────────────────────────────────────────
//
// Business question: ماذا تم تحصيله خلال الفترة؟
function OverviewSection({ summary, cashflowRows, isLoading }: Readonly<{
  summary: NonNullable<ReturnType<typeof useFinancialPeriodSummaryReport>['data']> | undefined;
  cashflowRows: NonNullable<ReturnType<typeof useFinancialCashflowReport>['data']>['rows'];
  isLoading: boolean;
}>) {
  const emptySummary = { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, netCash: 0, invoicesCount: 0, paymentsCount: 0, expensesCount: 0 };
  const report = summary ?? emptySummary;

  return (
    <ReportCard
      id="overview"
      title="نظرة عامة على الفترة"
      description="ملخص الفواتير والتحصيل والمصروفات المسجلة للفترة المحددة."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('financial-summary'), toFinancialSummaryCsv(report))}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="إجمالي الفواتير" value={formatMoney(report.invoiced)} icon={WalletCards} accent="sky" sub={`${report.invoicesCount} فواتير`} />
        <KpiCard label="إجمالي التحصيل" value={formatMoney(report.paid)} icon={WalletCards} accent="emerald" sub={`${report.paymentsCount} مدفوعات`} />
        <KpiCard label="الرصيد المستحق" value={formatMoney(report.outstanding)} icon={WalletCards} accent="amber" sub="من فواتير الفترة" />
        <KpiCard label="إجمالي المصروفات" value={formatMoney(report.expenses)} icon={WalletCards} accent="rose" sub={`${report.expensesCount} مصروفات`} />
      </div>
      <div className="h-72 p-4 pt-0">
        {cashflowRows.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">لا توجد بيانات شهرية كافية لعرض التدفق النقدي للفترة.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashflowRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" name="المحصّل" fill="#0f766e" />
              <Bar dataKey="expenses" name="المصاريف" fill="#e11d48" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ReportCard>
  );
}

// ── Collections section: التحصيلات ───────────────────────────────────────────
//
// Business questions: ما الذي تم تحصيله يومياً؟ ومن سدد خلال الفترة؟
//
// We keep this section table-first. We removed the decorative stacked-bar
// chart that was here previously; the daily-collection cards and rent roll
// already answer the question without chart clutter.
function CollectionsSection({ rows, receiptRows, rentRollRows, isLoading }: Readonly<{
  rows: DailyCollectionReportRow[];
  receiptRows: Array<{ id: string; receipt_number: string; payment_date: string; amount: number; tenant_name: string | null }>;
  rentRollRows: RentRollRow[];
  isLoading: boolean;
}>) {
  return (
    <div className="space-y-4">
      <ReportCard
        id="collections"
        title="التحصيل اليومي للفترة"
        description="تفصيل يومي للتحصيل مع تفصيل طرق الدفع لكل يوم."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('daily-collection'), toDailyCollectionCsv(rows))}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
        isLoading={isLoading}
      >
        {/* Mobile cards */}
        <div className="grid gap-3 p-4 md:hidden">
          {rows.map((row) => (
            <div key={row.paymentDate} className="rounded-2xl border bg-background p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{formatDate(row.paymentDate)}</span>
                <span className="font-black" dir="ltr">{formatMoney(row.totalPaid)}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>نقداً: <span className="font-medium text-foreground" dir="ltr">{formatMoney(row.methodTotals.cash)}</span></span>
                <span>تحويل: <span className="font-medium text-foreground" dir="ltr">{formatMoney(row.methodTotals.bank_transfer)}</span></span>
                <span>بطاقة: <span className="font-medium text-foreground" dir="ltr">{formatMoney(row.methodTotals.card)}</span></span>
                <span>شيك: <span className="font-medium text-foreground" dir="ltr">{formatMoney(row.methodTotals.check)}</span></span>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد تحصيلات في الفترة المحددة.</p> : null}
        </div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>عدد المدفوعات</TableHead>
                <TableHead>نقداً</TableHead>
                <TableHead>تحويل</TableHead>
                <TableHead>بطاقة</TableHead>
                <TableHead>شيك</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.paymentDate}>
                  <TableCell>{formatDate(row.paymentDate)}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.totalPaid)}</TableCell>
                  <TableCell>{row.paymentsCount.toLocaleString('ar')}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.methodTotals.cash)}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.methodTotals.bank_transfer)}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.methodTotals.card)}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.methodTotals.check)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد تحصيلات في الفترة المحددة.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-black">روابط الإيصالات المتاحة</p>
              <p className="text-xs text-muted-foreground">أحدث {latestReceiptLimit} إيصال قابل للفتح والطباعة من السجل.</p>
            </div>
            <ReceiptText className="size-5 text-primary" />
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {receiptRows.map((receipt) => (
              <a key={receipt.id} className="rounded-2xl border border-border bg-background/80 p-3 transition hover:border-primary/40" href={createReceiptPrintHref(receipt.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black">{receipt.receipt_number}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(receipt.payment_date)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{receipt.tenant_name ?? '—'}</span>
                  <span className="font-black" dir="ltr">{formatMoney(receipt.amount)}</span>
                </div>
              </a>
            ))}
            {receiptRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد إيصالات متاحة ضمن الفترة المحددة.</p> : null}
          </div>
        </div>
      </ReportCard>

      <ReportCard
        title="قائمة العقود الإيجارية (Rent Roll)"
        description="عقود الإيجار الحالية فقط، مع روابط آمنة لتفاصيل العقود."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('rent-roll'), rentRollRows)}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
        isLoading={isLoading}
      >
        {/* Mobile cards */}
        <div className="grid gap-3 p-4 md:hidden">
          {rentRollRows.map((row) => (
            <div key={row.contractId} className="rounded-2xl border bg-background p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} />
                <StatusBadge tone="green">{row.statusLabel}</StatusBadge>
              </div>
              <p className="font-medium">{row.tenantName}</p>
              <p className="text-muted-foreground">{row.propertyTitle} · {row.unitNumber}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-black" dir="ltr">{formatMoney(row.rentAmount)}</span>
                <span className="text-xs text-muted-foreground">{row.paymentCycle}</span>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(row.startDate)} — {formatDate(row.endDate)}</p>
            </div>
          ))}
          {rentRollRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد عقود ضمن البيانات الحالية.</p> : null}
        </div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العقد</TableHead>
                <TableHead>المستأجر</TableHead>
                <TableHead>العقار/الوحدة</TableHead>
                <TableHead>الإيجار</TableHead>
                <TableHead>الدورة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الفترة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentRollRows.map((row) => (
                <TableRow key={row.contractId}>
                  <TableCell><SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} /></TableCell>
                  <TableCell>{row.tenantName}</TableCell>
                  <TableCell>{row.propertyTitle} · {row.unitNumber}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.rentAmount)}</TableCell>
                  <TableCell>{row.paymentCycle}</TableCell>
                  <TableCell>{row.statusLabel}</TableCell>
                  <TableCell>{formatDate(row.startDate)} — {formatDate(row.endDate)}</TableCell>
                </TableRow>
              ))}
              {rentRollRows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد عقود ضمن البيانات الحالية.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </ReportCard>
    </div>
  );
}

// ── Overdue section: المتأخرات ───────────────────────────────────────────────
//
// Business questions: ما الفواتير غير المدفوعة؟ من المتأخر؟ وأين تقع أعمار الذمم؟
//
// We replaced the decorative stacked-bar "payments trend" chart with a clear
// list of the highest-overdue invoices plus the aging buckets — that answers
// the question directly without chart clutter.
function OverdueSection({ rows, agedReport, isLoading }: Readonly<{
  rows: OverdueInvoiceReportRow[];
  agedReport: NonNullable<ReturnType<typeof useAgedReceivablesReport>['data']> | undefined;
  isLoading: boolean;
}>) {
  const bucketRows = buildAgingBucketChartRows(agedReport?.buckets, agingBucketKeys);

  return (
    <div className="space-y-4">
      <ReportCard
        id="overdue"
        title="الفواتير المتأخرة حسب as-of"
        description="الفواتير المتأخرة المحسوبة من خدمة arrears الحالية حسب تاريخ الاحتساب."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('overdue-invoices'), rows)}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
        isLoading={isLoading}
      >
        {/* Mobile cards */}
        <div className="grid gap-3 p-4 md:hidden">
          {rows.slice(0, 20).map((row) => (
            <div key={row.invoiceId} className="rounded-2xl border bg-background p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <SafeAnchor href="/invoices" label={row.shortInvoiceId} />
                <span className="text-xs font-bold text-destructive">{row.daysOverdue.toLocaleString('ar')} يوم</span>
              </div>
              <p className="font-medium">{row.tenantName ?? '—'}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>
                <span className="font-black text-destructive" dir="ltr">{formatMoney(row.remainingAmount)}</span>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة حسب تاريخ as-of.</p> : null}
        </div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الفاتورة</TableHead>
                <TableHead>العقد</TableHead>
                <TableHead>المستأجر</TableHead>
                <TableHead>الاستحقاق</TableHead>
                <TableHead>أيام التأخير</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell><SafeAnchor href="/invoices" label={row.shortInvoiceId} /></TableCell>
                  <TableCell><SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} /></TableCell>
                  <TableCell>{row.tenantName ?? '—'}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>{row.daysOverdue.toLocaleString('ar')}</TableCell>
                  <TableCell dir="ltr">{formatMoney(row.remainingAmount)}</TableCell>
                  <TableCell>{formatInvoiceStatusLabel(row.status)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد فواتير متأخرة حسب تاريخ as-of.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </ReportCard>

      <ReportCard
        title="تقادم الذمم حسب الفئة العمرية"
        description="ملخص أعمار الذمم والفواتير المتراكمة في كل فئة عمرية."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('aged-receivables'), bucketRows.map((row) => ({ bucket: row.bucket, total: row.total, invoiceCount: row.invoiceCount })))}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
        isLoading={isLoading}
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {bucketRows.map((row) => {
            const isCurrent = row.bucket === agingBucketKeys[0];
            return (
              <KpiCard
                key={row.bucket}
                label={row.bucket}
                value={formatMoney(row.total)}
                icon={isCurrent ? WalletCards : AlertTriangle}
                accent={isCurrent ? 'emerald' : 'amber'}
                sub={`${row.invoiceCount.toLocaleString('ar')} فواتير`}
              />
            );
          })}
        </div>
      </ReportCard>
    </div>
  );
}

// ── Expenses section: المصروفات ──────────────────────────────────────────────
//
// Business question: ما المصروفات المسجلة للفترة وكيف تتوزع؟
function ExpensesSection({ report, isLoading }: Readonly<{
  report: NonNullable<ReturnType<typeof useExpenseBreakdownReport>['data']> | undefined;
  isLoading: boolean;
}>) {
  const categoryRows = report?.byCategory ?? [];
  const propertyRows = report?.byProperty ?? [];

  return (
    <ReportCard
      id="expenses"
      title="تحليل المصروفات للفترة"
      description="تفصيل المصروفات حسب التصنيف والعقار من تقرير المصروفات الموجود."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('expense-breakdown'), [...categoryRows, ...propertyRows])}><FileSpreadsheet className="ml-2 size-4" />تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <KpiCard label="إجمالي المصروفات" value={formatMoney(report?.totalExpenses ?? 0)} icon={WalletCards} accent="rose" sub={`${report?.expensesCount ?? 0} مصروفات`} />
        <KpiCard label="تصنيفات المصروفات" value={(categoryRows.length).toLocaleString('ar')} icon={ClipboardList} accent="amber" sub="حسب category المحفوظ" />
        <KpiCard label="عقارات بها مصروفات" value={(propertyRows.length).toLocaleString('ar')} icon={Building2} accent="sky" sub="حسب معرّف العقار المحفوظ" />
      </div>
      <div className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 font-black">حسب التصنيف</p>
          <div className="space-y-2">
            {categoryRows.map((row) => (
              <div key={row.category} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3 text-sm">
                <span>{row.category} · {row.count.toLocaleString('ar')}</span>
                <span className="font-black" dir="ltr">{formatMoney(row.total)}</span>
              </div>
            ))}
            {categoryRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مصروفات في الفترة المحددة.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 font-black">حسب العقار</p>
          <div className="space-y-2">
            {propertyRows.map((row) => (
              <div key={row.propertyId} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3 text-sm">
                <span>{row.propertyTitle ?? formatShortId(row.propertyId)} · {row.count.toLocaleString('ar')}</span>
                <span className="font-black" dir="ltr">{formatMoney(row.total)}</span>
              </div>
            ))}
            {propertyRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مصروفات مرتبطة بعقارات في الفترة المحددة.</p> : null}
          </div>
        </div>
      </div>
    </ReportCard>
  );
}

// ── Occupancy section: الإشغال والعcontracts ────────────────────────────────
//
// Business questions: ما الوحدات الشاغرة؟ وما العقود القريبة من الانتهاء؟
function OccupancySection({ occupancyRows, expiringRows, isLoading }: Readonly<{
  occupancyRows: ReturnType<typeof buildOccupancyRows>;
  expiringRows: ReturnType<typeof buildExpiringContractsRows>;
  isLoading: boolean;
}>) {
  return (
    <ReportCard
      id="occupancy"
      title="الإشغال والعقود القريبة من الانتهاء"
      description="مؤشر إشغال الوحدات الحالية، وتنبيه عقود تنتهي خلال 60 يوم."
      isLoading={isLoading}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 flex items-center justify-between gap-2 font-black">
            <span>الإشغال حسب العقار</span>
            <Building2 className="size-4 text-muted-foreground" />
          </p>
          <div className="space-y-2">
            {occupancyRows.map((row) => (
              <div key={row.propertyId} className="rounded-xl bg-muted/30 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold">{row.property}</span>
                    {!row.hasTitle && row.shortPropertyId ? (
                      <span className="ms-2 text-[10px] text-muted-foreground/70" dir="ltr">#{row.shortPropertyId}</span>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">{(row.occupied + row.vacant).toLocaleString('ar')} وحدة</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="مشغولة" value={row.occupied.toLocaleString('ar')} icon={Building2} accent="emerald" sub="من حالة الوحدة" compact />
                  <KpiCard label="شاغرة/أخرى" value={row.vacant.toLocaleString('ar')} icon={Building2} accent="amber" sub="غير occupied" compact />
                </div>
              </div>
            ))}
            {occupancyRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد وحدات متاحة لحساب الإشغال.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 flex items-center justify-between gap-2 font-black">
            <span>عقود تنتهي خلال {expiringContractWindowDays} يوم</span>
            <CalendarClock className="size-4 text-muted-foreground" />
          </p>
          <div className="space-y-2">
            {expiringRows.map((row) => (
              <div key={row.contractId} className="rounded-xl bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} />
                  <StatusBadge tone={row.daysRemaining <= 15 ? 'red' : 'gold'}>{row.daysRemaining.toLocaleString('ar')} يوم</StatusBadge>
                </div>
                <p className="mt-2 font-medium">{row.tenantName}</p>
                <p className="text-muted-foreground">{row.propertyTitle} · {row.unitNumber} · {formatDate(row.endDate)}</p>
              </div>
            ))}
            {expiringRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد عقود نشطة تنتهي قريباً ضمن البيانات الحالية.</p> : null}
          </div>
        </div>
      </div>
    </ReportCard>
  );
}

// ── Statements section: كشوف الحساب ─────────────────────────────────────────
//
// We render three honest statement cards only — كشف حساب المستأجر,
// ملخص حركة المالك, ملخص حركة المكتب — each from existing supported data.
// We deliberately do NOT render running balances, do not call this a ledger,
// and do not imply final settlement or payout readiness.
function StatementsSection({ agedReport, receiptRows, financialSummary, expenseBreakdown, dailyRows, isLoading }: Readonly<{
  agedReport: NonNullable<ReturnType<typeof useAgedReceivablesReport>['data']> | undefined;
  receiptRows: Array<{ id: string; receipt_number: string; payment_date: string; amount: number; tenant_name: string | null }>;
  financialSummary: NonNullable<ReturnType<typeof useFinancialPeriodSummaryReport>['data']> | undefined;
  expenseBreakdown: NonNullable<ReturnType<typeof useExpenseBreakdownReport>['data']> | undefined;
  dailyRows: DailyCollectionReportRow[];
  isLoading: boolean;
}>) {
  const tenantRows = (agedReport?.rows ?? []).slice(0, 6);
  const ownerMovementRows = (expenseBreakdown?.byProperty ?? []).slice(0, 6);
  const totalCollections = dailyRows.reduce((total, row) => total + row.totalPaid, 0);
  const totalExpenses = financialSummary?.expenses ?? 0;
  const totalInvoiced = financialSummary?.invoiced ?? 0;
  const totalOutstanding = financialSummary?.outstanding ?? 0;
  const totalPayments = financialSummary?.paymentsCount ?? 0;
  const totalInvoicesCount = financialSummary?.invoicesCount ?? 0;
  const totalExpensesCount = financialSummary?.expensesCount ?? 0;
  const totalReceiptsCount = receiptRows.length;

  return (
    <div id="statements" className="space-y-4">
      <Card className="scroll-mt-28 border-border/60 bg-muted/20">
        <CardHeader className="px-4 py-3 sm:px-5">
          <CardTitle className="text-sm font-black">كشوف الحساب</CardTitle>
          <CardDescription>
            كشوف حركة تشغيلية للقراءة فقط. لا تعرض هذه الصفحة أرصدة جارية ولا تسويات نهائية ولا دفتر أستاذ محاسبي.
            إذا لم تتوفر بيانات كافية، تظهر رسالة توضيح بدلاً من أرقام مُقدَّرة.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <CardTitle className="text-sm font-black">كشف حساب المستأجر</CardTitle>
            <CardDescription>ذمم ومتأخرات المستأجرين من تقرير receivables، مع أحدث إيصالات متاحة من السجل.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-5">
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : tenantRows.length === 0 ? (
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                <Inbox className="size-5 text-muted-foreground/70" />
                لا توجد ذمم مستأجرين حسب تاريخ as-of.
              </div>
            ) : (
              tenantRows.map((row) => (
                <div key={row.contractId} className="rounded-xl bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{row.tenantName ?? 'مستأجر غير محدد'}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">ذمم</span>
                    <span className="font-black" dir="ltr">{formatMoney(row.totalOutstanding)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">متأخر</span>
                    <span className="font-black text-destructive" dir="ltr">{formatMoney(row.totalOverdue)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{row.invoiceCount.toLocaleString('ar')} فواتير مرتبطة</p>
                </div>
              ))
            )}
            {receiptRows.slice(0, 3).map((receipt) => (
              <a key={`receipt-${receipt.id}`} className="block rounded-xl border p-3 text-sm hover:border-primary/40" href={createReceiptPrintHref(receipt.id)}>
                {receipt.receipt_number} · {receipt.tenant_name ?? '—'} · <span dir="ltr">{formatMoney(receipt.amount)}</span>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <CardTitle className="text-sm font-black">ملخص حركة المالك</CardTitle>
            <CardDescription>ملخص حركة عقار مدعوم بالمصروفات المرتبطة به. ليس كشف تسوية مالك.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-5">
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : ownerMovementRows.length === 0 ? (
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
                <Inbox className="size-5 text-muted-foreground/70" />
                لا توجد حركة مصروفات عقارية للفترة المحددة، ولا تتوفر بيانات مالك تفصيلية بعد.
              </div>
            ) : (
              ownerMovementRows.map((row) => (
                <div key={row.propertyId} className="rounded-xl bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{row.propertyTitle ?? formatShortId(row.propertyId)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">مصروفات مسجلة</span>
                    <span className="font-black" dir="ltr">{formatMoney(row.total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.count.toLocaleString('ar')} حركة مصروفات في الفترة</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <CardTitle className="text-sm font-black">ملخص حركة المكتب</CardTitle>
            <CardDescription>ملخص فواتير وتحصيلات ومصروفات للفترة، وليس قائمة دخل أو دفتر حسابات.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 sm:p-5">
            <KpiCard label="فواتير الفترة" value={formatMoney(totalInvoiced)} icon={WalletCards} accent="sky" sub={`${totalInvoicesCount} فواتير`} compact />
            <KpiCard label="تحصيلات الفترة" value={formatMoney(totalCollections)} icon={WalletCards} accent="emerald" sub={`${totalPayments} مدفوعات`} compact />
            <KpiCard label="مصروفات الفترة" value={formatMoney(totalExpenses)} icon={WalletCards} accent="rose" sub={`${totalExpensesCount} مصروفات`} compact />
            <KpiCard label="رصيد مستحق (قراءة فقط)" value={formatMoney(totalOutstanding)} icon={WalletCards} accent="amber" sub={`${totalReceiptsCount} إيصالات متاحة للطباعة`} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>(() => getCurrentMonthFilters());
  const [activeSection, setActiveSection] = useState<ReportSectionId>('overview');
  const financialFilters = useMemo(() => ({ dateFrom: filters.from, dateTo: filters.to }), [filters.from, filters.to]);
  const arrearsFilters = useMemo(() => ({ asOf: filters.asOf }), [filters.asOf]);

  const financialSummaryQuery = useFinancialPeriodSummaryReport(financialFilters);
  const financialCashflowQuery = useFinancialCashflowReport(financialFilters);
  const dailyCollectionQuery = useDailyCollectionReport(financialFilters);
  const expenseBreakdownQuery = useExpenseBreakdownReport(financialFilters);
  const overdueInvoicesQuery = useOverdueInvoicesReport(arrearsFilters);
  const agedReceivablesQuery = useAgedReceivablesReport(arrearsFilters);
  const contractsQuery = useContracts({ status: 'all' });
  const unitsQuery = useAllUnits();
  const receiptsQuery = useReceipts({ limit: latestReceiptLimit });
  const propertyTitlesQuery = usePropertyTitles();
  const propertyTitlesById = useMemo(
    () => new Map((propertyTitlesQuery.data ?? []).map((row) => [row.id, row.title] as const)),
    [propertyTitlesQuery.data],
  );

  const rentRollRows = useMemo(() => buildRentRollRows(contractsQuery.data ?? [], contractStatusLabels), [contractsQuery.data]);
  const occupancyRows = useMemo(
    () => buildOccupancyRows(unitsQuery.data ?? [], propertyTitlesById),
    [unitsQuery.data, propertyTitlesById],
  );
  const expiringRows = useMemo(() => buildExpiringContractsRows(contractsQuery.data ?? [], new Date()), [contractsQuery.data]);
  const paymentsTrendRows = useMemo(() => buildPaymentsTrendRows({
    dailyCollections: dailyCollectionQuery.data?.rows,
    overdueInvoices: overdueInvoicesQuery.data?.rows,
  }), [dailyCollectionQuery.data?.rows, overdueInvoicesQuery.data?.rows]);
  const receiptRows = useMemo(() => (receiptsQuery.data ?? [])
    .filter((receipt) => isWithinDateRange(receipt.payment_date, filters))
    .map((receipt) => ({
      id: receipt.id,
      receipt_number: receipt.receipt_number,
      payment_date: receipt.payment_date,
      amount: receipt.amount,
      tenant_name: receipt.tenant_name,
    })), [filters, receiptsQuery.data]);

  // paymentsTrendRows is still useful as a private signal of which months have
  // data, but the visible chart only renders for the overview section so we
  // intentionally don't surface the combined collections/overdue chart.
  void paymentsTrendRows;

  const isLoading = financialSummaryQuery.isLoading
    || financialCashflowQuery.isLoading
    || dailyCollectionQuery.isLoading
    || expenseBreakdownQuery.isLoading
    || overdueInvoicesQuery.isLoading
    || agedReceivablesQuery.isLoading
    || contractsQuery.isLoading
    || unitsQuery.isLoading
    || receiptsQuery.isLoading;
  const firstError = financialSummaryQuery.error
    ?? financialCashflowQuery.error
    ?? dailyCollectionQuery.error
    ?? expenseBreakdownQuery.error
    ?? overdueInvoicesQuery.error
    ?? agedReceivablesQuery.error
    ?? contractsQuery.error
    ?? unitsQuery.error
    ?? receiptsQuery.error;

  const handleJumpToSection = (id: ReportSectionId) => {
    setActiveSection(id);
    if (typeof window === 'undefined') return;
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const today = getTodayLocalDateString();

  return (
    <div className="space-y-5 pb-6" dir="rtl">
      <ReportsHero summary={financialSummaryQuery.data} today={today} isLoading={financialSummaryQuery.isLoading} />

      <FiltersPanel
        filters={filters}
        onChange={setFilters}
        onResetCurrentMonth={() => setFilters(getCurrentMonthFilters())}
      />

      <SectionNav activeId={activeSection} onJump={handleJumpToSection} />

      {firstError ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            {getErrorMessage(firstError, 'تعذر تحميل بعض التقارير. يمكنك تحديث الصفحة أو إعادة المحاولة بأمان دون تعديل أي بيانات.')}
          </CardContent>
        </Card>
      ) : null}

      <OverviewSection
        summary={financialSummaryQuery.data}
        cashflowRows={financialCashflowQuery.data?.rows ?? []}
        isLoading={financialSummaryQuery.isLoading || financialCashflowQuery.isLoading}
      />
      <CollectionsSection
        rows={dailyCollectionQuery.data?.rows ?? []}
        receiptRows={receiptRows}
        rentRollRows={rentRollRows}
        isLoading={dailyCollectionQuery.isLoading || receiptsQuery.isLoading || contractsQuery.isLoading}
      />
      <OverdueSection
        rows={overdueInvoicesQuery.data?.rows ?? []}
        agedReport={agedReceivablesQuery.data}
        isLoading={overdueInvoicesQuery.isLoading || agedReceivablesQuery.isLoading}
      />
      <ExpensesSection report={expenseBreakdownQuery.data} isLoading={expenseBreakdownQuery.isLoading} />
      <OccupancySection
        occupancyRows={occupancyRows}
        expiringRows={expiringRows}
        isLoading={unitsQuery.isLoading || contractsQuery.isLoading}
      />
      <StatementsSection
        agedReport={agedReceivablesQuery.data}
        receiptRows={receiptRows}
        financialSummary={financialSummaryQuery.data}
        expenseBreakdown={expenseBreakdownQuery.data}
        dailyRows={dailyCollectionQuery.data?.rows ?? []}
        isLoading={agedReceivablesQuery.isLoading || receiptsQuery.isLoading || financialSummaryQuery.isLoading || expenseBreakdownQuery.isLoading || dailyCollectionQuery.isLoading}
      />
    </div>
  );
}

// Tiny inline hook that fetches just `id` and `title` for every non-deleted
// property so the occupancy section in /reports can render a friendly name
// instead of "عقار <sliced id>". Safe to keep this minimal — we do not
// touch any other backend read here.
function usePropertyTitles() {
  return useQuery({
    queryKey: ['reports', 'propertyTitles'],
    queryFn: async (): Promise<Array<{ id: string; title: string }>> => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title')
        .is('deleted_at', null)
        .returns<Array<Pick<Property, 'id' | 'title'>>>();
      if (error) throw error;
      return (data ?? [])
        .map((row) => ({ id: row.id, title: (row.title ?? '').trim() }))
        .filter((row) => row.title.length > 0);
    },
    staleTime: 60_000,
  });
}
