import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpLeft, CalendarDays, ReceiptText, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { buildAgingBucketChartRows, buildOccupancyRows, buildPaymentsTrendRows, buildRentRollRows, createReceiptPrintHref } from './reports-page.helpers';

export { escapeCsvValue } from '@/lib/csvExport';

type FilterState = Readonly<{ from: string; to: string; asOf: string }>;
type ReportCardProps = Readonly<{ title: string; description: string; children: React.ReactNode; action?: React.ReactNode; isLoading?: boolean }>;
type MetricCardProps = Readonly<{ label: string; value: string; helper: string; tone?: 'blue' | 'green' | 'red' | 'gray' | 'gold' }>;

type RentRollRow = ReturnType<typeof buildRentRollRows>[number];

type SafeLinkProps = Readonly<{
  href: string;
  label: string;
}>;

const latestReceiptLimit = 100;
const supportedReportNames = [
  'ملخص التحصيل للفترة',
  'قائمة العقود الإيجارية (Rent Roll)',
  'الفواتير المتأخرة',
  'تقادم الذمم',
  'التحصيل اليومي',
  'تحليل المصروفات',
  'الإشغال',
  'كشوف الحساب التشغيلية',
];
const agingBucketKeys: Array<AgedReceivablesBucket['key']> = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'];
const contractStatusLabels: Record<ContractListItem['status'], string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'منهى',
};
const expiringContractWindowDays = 60;

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
      <div className="grid gap-3 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function ReportCard({ title, description, action, children, isLoading = false }: ReportCardProps) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-card/95">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-muted/20 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isLoading ? null : action}
      </CardHeader>
      <CardContent className="p-0">{isLoading ? <SectionSkeleton /> : children}</CardContent>
    </Card>
  );
}

function MetricCard({ label, value, helper, tone = 'blue' }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <StatusBadge tone={tone}>قراءة فقط</StatusBadge>
      </div>
      <p className="mt-3 text-2xl font-black" dir="ltr">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function FiltersPanel({ filters, onChange, onResetCurrentMonth }: Readonly<{
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onResetCurrentMonth: () => void;
}>) {
  return (
    <Card className="border-primary/10 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-primary">مركز التقارير التشغيلية</p>
            <h2 className="text-3xl font-black tracking-tight">مركز التقارير</h2>
            <CardDescription>تقارير تشغيلية للقراءة والتصدير تساعدك على متابعة التحصيل، العقود، والمتأخرات من مكان واحد.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild><Link to="/invoices">الفواتير</Link></Button>
            <Button variant="secondary" asChild><Link to="/arrears">المتأخرات</Link></Button>
            <Button variant="secondary" asChild><Link to="/owners">الملاك</Link></Button>
            <Button variant="secondary" asChild><Link to="/tenants">المستأجرين</Link></Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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

function FinancialSummarySection({ summary, cashflowRows, isLoading }: Readonly<{
  summary: NonNullable<ReturnType<typeof useFinancialPeriodSummaryReport>['data']> | undefined;
  cashflowRows: NonNullable<ReturnType<typeof useFinancialCashflowReport>['data']>['rows'];
  isLoading: boolean;
}>) {
  const emptySummary = { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, netCash: 0, invoicesCount: 0, paymentsCount: 0, expensesCount: 0 };
  const report = summary ?? emptySummary;

  return (
    <ReportCard
      title="1. ملخص التحصيل للفترة"
      description="ملخص للفترة المحددة يجمع الفواتير والتحصيل والمصروفات المسجلة."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('financial-summary'), toFinancialSummaryCsv(report))}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="grid gap-3 p-4 md:grid-cols-5">
        <MetricCard label="إجمالي الفواتير" value={formatMoney(report.invoiced)} helper={`${report.invoicesCount} فواتير`} />
        <MetricCard label="إجمالي التحصيل" value={formatMoney(report.paid)} helper={`${report.paymentsCount} مدفوعات`} tone="green" />
        <MetricCard label="الرصيد المستحق" value={formatMoney(report.outstanding)} helper="من فواتير الفترة" tone="gold" />
        <MetricCard label="إجمالي المصروفات" value={formatMoney(report.expenses)} helper={`${report.expensesCount} مصروفات`} tone="red" />
        <MetricCard label="المحصل بعد المصروفات" value={formatMoney(report.netCash)} helper="المحصّل - المصروفات المسجلة فقط" tone={report.netCash >= 0 ? 'green' : 'red'} />
      </div>
      <div className="h-80 p-4 pt-0">
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
      </div>
    </ReportCard>
  );
}

function RentRollSection({ rows, isLoading }: Readonly<{ rows: RentRollRow[]; isLoading: boolean }>) {
  return (
    <ReportCard
      title="2. قائمة العقود الإيجارية (Rent Roll)"
      description="قائمة الإيجارات من العقود الحالية فقط، مع روابط آمنة لتفاصيل العقود."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('rent-roll'), rows)}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      {/* Mobile cards */}
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((row) => (
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
        {rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عقود ضمن البيانات الحالية.</p>}
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
            {rows.map((row) => (
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
            {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">لا توجد عقود ضمن البيانات الحالية.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </ReportCard>
  );
}

function OverdueInvoicesSection({ rows, trendRows, isLoading }: Readonly<{
  rows: OverdueInvoiceReportRow[];
  trendRows: ReturnType<typeof buildPaymentsTrendRows>;
  isLoading: boolean;
}>) {
  return (
    <ReportCard
      title="3. الفواتير المتأخرة"
      description="الفواتير المتأخرة المحسوبة من خدمة arrears الحالية حسب as-of date."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('overdue-invoices'), rows)}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="collections" name="التحصيل" fill="#0f766e" />
            <Bar dataKey="overdue" name="المتأخر" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Mobile cards */}
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((row) => (
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
        {rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة حسب تاريخ as-of.</p>}
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
  );
}

function AgedReceivablesSection({ report, isLoading }: Readonly<{
  report: NonNullable<ReturnType<typeof useAgedReceivablesReport>['data']> | undefined;
  isLoading: boolean;
}>) {
  const rows = report?.rows ?? [];
  const bucketChartRows = buildAgingBucketChartRows(report?.buckets, agingBucketKeys);

  return (
    <ReportCard
      title="4. تقادم الذمم"
      description="تقادم الذمم حسب العقود والفئات العمرية الآمنة من خدمة التقارير الحالية."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('aged-receivables'), rows.map((row) => ({ contractId: row.contractId, tenantName: row.tenantName, totalOutstanding: row.totalOutstanding, totalOverdue: row.totalOverdue, invoiceCount: row.invoiceCount })))}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="grid gap-3 p-4 md:grid-cols-5">
        {agingBucketKeys.map((key) => {
          const bucket = report?.buckets[key];
          return <MetricCard key={key} label={bucket?.label ?? key} value={formatMoney(bucket?.total ?? 0)} helper={`${bucket?.invoiceCount ?? 0} فواتير`} tone={key === 'current' ? 'green' : 'gold'} />;
        })}
      </div>
      <div className="h-72 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bucketChartRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="إجمالي الذمم" fill="#d97706" />
            <Bar dataKey="invoiceCount" name="عدد الفواتير" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Mobile cards */}
      <div className="grid gap-3 p-4 md:hidden">
        {rows.map((row) => (
          <div key={row.contractId} className="rounded-2xl border bg-background p-4 space-y-2 text-sm">
            <SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} />
            <p className="font-medium">{row.tenantName ?? '—'}</p>
            <p className="text-muted-foreground">{row.propertyTitle ?? '—'} · {row.unitNumber ?? '—'}</p>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">الذمم</p>
                <p className="font-black" dir="ltr">{formatMoney(row.totalOutstanding)}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">المتأخر</p>
                <p className="font-black text-destructive" dir="ltr">{formatMoney(row.totalOverdue)}</p>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ذمم مستحقة حسب تاريخ as-of.</p>}
      </div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العقد</TableHead>
              <TableHead>المستأجر</TableHead>
              <TableHead>العقار/الوحدة</TableHead>
              <TableHead>إجمالي الذمم</TableHead>
              <TableHead>المتأخر</TableHead>
              <TableHead>عدد الفواتير</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.contractId}>
                <TableCell><SafeAnchor href={`/contracts/${encodeURIComponent(row.contractId)}`} label={formatShortId(row.contractId)} /></TableCell>
                <TableCell>{row.tenantName ?? '—'}</TableCell>
                <TableCell>{row.propertyTitle ?? '—'} · {row.unitNumber ?? '—'}</TableCell>
                <TableCell dir="ltr">{formatMoney(row.totalOutstanding)}</TableCell>
                <TableCell dir="ltr">{formatMoney(row.totalOverdue)}</TableCell>
                <TableCell>{row.invoiceCount.toLocaleString('ar')}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد ذمم مستحقة حسب تاريخ as-of.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </ReportCard>
  );
}

function DailyCollectionSection({ rows, receiptRows, isLoading }: Readonly<{
  rows: DailyCollectionReportRow[];
  receiptRows: Array<{ id: string; receipt_number: string; payment_date: string; amount: number; tenant_name: string | null }>;
  isLoading: boolean;
}>) {
  return (
    <ReportCard
      title="5. التحصيل اليومي"
      description="ملخص يومي للتحصيل مع روابط مباشرة لفتح إيصالات الدفع وطباعتها."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('daily-collection'), toDailyCollectionCsv(rows))}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="h-72 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="paymentDate" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalPaid" name="إجمالي التحصيل" fill="#0f766e" />
            <Bar dataKey="paymentsCount" name="عدد المدفوعات" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
        {rows.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تحصيلات في الفترة المحددة.</p>}
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
          {receiptRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد إيصالات متاحة ضمن أحدث النتائج للفترة المحددة.</p> : null}
        </div>
      </div>
    </ReportCard>
  );
}

function ExpenseBreakdownSection({ report, isLoading }: Readonly<{
  report: NonNullable<ReturnType<typeof useExpenseBreakdownReport>['data']> | undefined;
  isLoading: boolean;
}>) {
  const categoryRows = report?.byCategory ?? [];
  const propertyRows = report?.byProperty ?? [];

  return (
    <ReportCard
      title="6. تحليل المصروفات"
      description="تفصيل المصروفات المسجلة حسب التصنيف والعقار من تقرير المصروفات الموجود."
      action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('expense-breakdown'), [...categoryRows, ...propertyRows])}>تصدير CSV</Button>}
      isLoading={isLoading}
    >
      <div className="grid gap-3 p-4 md:grid-cols-3">
        <MetricCard label="إجمالي المصروفات" value={formatMoney(report?.totalExpenses ?? 0)} helper={`${report?.expensesCount ?? 0} مصروفات`} tone="red" />
        <MetricCard label="تصنيفات المصروفات" value={(categoryRows.length).toLocaleString('ar')} helper="حسب category المحفوظ" tone="gold" />
        <MetricCard label="عقارات بها مصروفات" value={(propertyRows.length).toLocaleString('ar')} helper="حسب property_id المحفوظ" tone="blue" />
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

function OccupancyAndExpirySection({ occupancyRows, expiringRows, isLoading }: Readonly<{
  occupancyRows: ReturnType<typeof buildOccupancyRows>;
  expiringRows: ReturnType<typeof buildExpiringContractsRows>;
  isLoading: boolean;
}>) {
  return (
    <ReportCard
      title="7. الإشغال والعقود القريبة"
      description="مؤشر إشغال من الوحدات الحالية وتنبيه عقود تنتهي قريباً من بيانات العقود الموجودة."
      isLoading={isLoading}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 font-black">الإشغال حسب العقار</p>
          <div className="space-y-2">
            {occupancyRows.map((row) => (
              <div key={row.property} className="rounded-xl bg-muted/30 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-bold">عقار {row.property}</span>
                  <span className="text-muted-foreground">{(row.occupied + row.vacant).toLocaleString('ar')} وحدة</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="مشغولة" value={row.occupied.toLocaleString('ar')} helper="من حالة الوحدة" tone="green" />
                  <MetricCard label="شاغرة/أخرى" value={row.vacant.toLocaleString('ar')} helper="غير occupied" tone="gold" />
                </div>
              </div>
            ))}
            {occupancyRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد وحدات متاحة لحساب الإشغال.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-background/80 p-3">
          <p className="mb-2 font-black">عقود تنتهي خلال {expiringContractWindowDays} يوم</p>
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

  return (
    <div id="statements">
      <ReportCard
        title="8. كشوف الحساب"
        description="كشوف حركة تشغيلية للقراءة فقط. لا تعرض أرصدة جارية ولا تسويات نهائية ولا دفتر أستاذ محاسبي."
        isLoading={isLoading}
      >
        <div className="grid gap-4 p-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-background/80 p-4">
            <div className="mb-3">
              <p className="font-black">كشف حساب المستأجر</p>
              <p className="text-xs text-muted-foreground">يعرض الذمم والمتأخرات من تقرير receivables، مع أحدث إيصالات متاحة من سجل الإيصالات.</p>
            </div>
            <div className="space-y-2">
              {tenantRows.map((row) => (
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
                </div>
              ))}
              {tenantRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد ذمم مستأجرين حسب تاريخ as-of.</p> : null}
              {receiptRows.slice(0, 3).map((receipt) => (
                <a key={receipt.id} className="block rounded-xl border p-3 text-sm hover:border-primary/40" href={createReceiptPrintHref(receipt.id)}>
                  {receipt.receipt_number} · {receipt.tenant_name ?? '—'} · <span dir="ltr">{formatMoney(receipt.amount)}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-background/80 p-4">
            <div className="mb-3">
              <p className="font-black">ملخص حركة المالك</p>
              <p className="text-xs text-muted-foreground">ملخص حركة عقار مدعوم بالمصروفات والعقود الظاهرة فقط، وليس كشف تسوية مالك.</p>
            </div>
            <div className="space-y-2">
              {ownerMovementRows.map((row) => (
                <div key={row.propertyId} className="rounded-xl bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{row.propertyTitle ?? formatShortId(row.propertyId)}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">مصروفات مسجلة</span>
                    <span className="font-black" dir="ltr">{formatMoney(row.total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.count.toLocaleString('ar')} حركة مصروفات في الفترة</p>
                </div>
              ))}
              {ownerMovementRows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حركة مصروفات عقارية للفترة المحددة.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border bg-background/80 p-4">
            <div className="mb-3">
              <p className="font-black">ملخص حركة المكتب</p>
              <p className="text-xs text-muted-foreground">ملخص تحصيلات وفواتير ومصروفات للفترة، وليس قائمة دخل أو دفتر حسابات.</p>
            </div>
            <div className="grid gap-2">
              <MetricCard label="فواتير الفترة" value={formatMoney(financialSummary?.invoiced ?? 0)} helper={`${financialSummary?.invoicesCount ?? 0} فواتير`} tone="blue" />
              <MetricCard label="تحصيلات الفترة" value={formatMoney(totalCollections)} helper={`${financialSummary?.paymentsCount ?? 0} مدفوعات`} tone="green" />
              <MetricCard label="مصروفات الفترة" value={formatMoney(financialSummary?.expenses ?? 0)} helper={`${financialSummary?.expensesCount ?? 0} مصروفات`} tone="red" />
              <MetricCard label="صافي حركة نقدية تشغيلية" value={formatMoney(financialSummary?.netCash ?? 0)} helper="تحصيلات ناقص مصروفات مسجلة فقط" tone={(financialSummary?.netCash ?? 0) >= 0 ? 'green' : 'red'} />
            </div>
          </div>
        </div>
      </ReportCard>
    </div>
  );
}

export function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>(() => getCurrentMonthFilters());
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

  const rentRollRows = useMemo(() => buildRentRollRows(contractsQuery.data ?? [], contractStatusLabels), [contractsQuery.data]);
  const occupancyRows = useMemo(() => buildOccupancyRows(unitsQuery.data ?? []), [unitsQuery.data]);
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

  return (
    <div className="space-y-6" dir="rtl">
      <FiltersPanel filters={filters} onChange={setFilters} onResetCurrentMonth={() => setFilters(getCurrentMonthFilters())} />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <CalendarDays className="size-4 text-primary" />
        <span className="text-sm font-bold text-muted-foreground">مدعوم الآن:</span>
        {supportedReportNames.map((name) => <StatusBadge key={name} tone="green">{name}</StatusBadge>)}
      </div>

      {firstError ? <Card><CardContent className="p-4 text-sm text-destructive">{getErrorMessage(firstError, 'تعذر تحميل بعض التقارير. يمكنك تحديث الصفحة أو إعادة المحاولة بأمان دون تعديل أي بيانات.')}</CardContent></Card> : null}
      {isLoading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">جارٍ تحميل معاينات التقارير التشغيلية للقراءة فقط، وستظهر كل بطاقة عند اكتمال بياناتها.</CardContent></Card> : null}

      <FinancialSummarySection
        summary={financialSummaryQuery.data}
        cashflowRows={financialCashflowQuery.data?.rows ?? []}
        isLoading={financialSummaryQuery.isLoading || financialCashflowQuery.isLoading}
      />
      <RentRollSection rows={rentRollRows} isLoading={contractsQuery.isLoading} />
      <OverdueInvoicesSection
        rows={overdueInvoicesQuery.data?.rows ?? []}
        trendRows={paymentsTrendRows}
        isLoading={overdueInvoicesQuery.isLoading || dailyCollectionQuery.isLoading}
      />
      <AgedReceivablesSection report={agedReceivablesQuery.data} isLoading={agedReceivablesQuery.isLoading} />
      <DailyCollectionSection rows={dailyCollectionQuery.data?.rows ?? []} receiptRows={receiptRows} isLoading={dailyCollectionQuery.isLoading || receiptsQuery.isLoading} />
      <ExpenseBreakdownSection report={expenseBreakdownQuery.data} isLoading={expenseBreakdownQuery.isLoading} />
      <OccupancyAndExpirySection
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
