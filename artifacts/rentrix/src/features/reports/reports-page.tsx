import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpLeft, CalendarDays, FileClock, ReceiptText, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  useFinancialCashflowReport,
  useFinancialPeriodSummaryReport,
  useOverdueInvoicesReport,
} from '@/features/financials/reports/useFinancialReports';
import { buildRentRollRows, createReceiptPrintHref, deferredReports } from './reports-page.helpers';

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;
type FilterState = Readonly<{ from: string; to: string; asOf: string }>;
type ReportCardProps = Readonly<{ title: string; description: string; children: React.ReactNode; action?: React.ReactNode }>;
type DeferredReportCardProps = Readonly<{ title: string; reason: string }>;
type MetricCardProps = Readonly<{ label: string; value: string; helper: string; tone?: 'blue' | 'green' | 'red' | 'gray' | 'gold' }>;

type RentRollRow = ReturnType<typeof buildRentRollRows>[number];

type SafeLinkProps = Readonly<{
  href: string;
  label: string;
}>;

const latestReceiptLimit = 100;
const supportedReportNames = [
  'Financial Summary',
  'Rent Roll',
  'Overdue Invoices',
  'Aged Receivables',
  'Daily Collection',
];
const agingBucketKeys: Array<AgedReceivablesBucket['key']> = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_90_plus'];
const contractStatusLabels: Record<ContractListItem['status'], string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'منهى',
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentMonthFilters(): FilterState {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayValue = toDateInputValue(today);

  return {
    from: toDateInputValue(firstDay),
    to: todayValue,
    asOf: todayValue,
  };
}

function escapeCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  return JSON.stringify(value);
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const keys = Object.keys(rows[0] ?? {}).sort((a, b) => a.localeCompare(b));
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => escapeCsvValue(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

function SafeAnchor({ href, label }: SafeLinkProps) {
  return (
    <a className="inline-flex items-center gap-1 font-black text-primary hover:underline" href={href}>
      {label}
      <ArrowUpLeft className="size-3" />
    </a>
  );
}

function ReportCard({ title, description, action, children }: ReportCardProps) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-card/95">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-muted/20 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function DeferredReportCard({ title, reason }: DeferredReportCardProps) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileClock className="size-4" />{title}</CardTitle>
          <StatusBadge tone="gray">Deferred</StatusBadge>
        </div>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function MetricCard({ label, value, helper, tone = 'blue' }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <StatusBadge tone={tone}>Live</StatusBadge>
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
            <p className="text-sm font-black text-primary">Reports hub</p>
            <h2 className="text-3xl font-black tracking-tight">مركز التقارير</h2>
            <CardDescription>تقارير موحدة من hooks/services الحالية فقط، بدون أرقام أو أرصدة مصطنعة.</CardDescription>
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
            <span>As-of date</span>
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

function FinancialSummarySection({ summary, cashflowRows }: Readonly<{
  summary: NonNullable<ReturnType<typeof useFinancialPeriodSummaryReport>['data']> | undefined;
  cashflowRows: NonNullable<ReturnType<typeof useFinancialCashflowReport>['data']>['rows'];
}>) {
  const emptySummary = { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, netCash: 0, invoicesCount: 0, paymentsCount: 0, expensesCount: 0 };
  const report = summary ?? emptySummary;

  return (
    <ReportCard
      title="1. Financial Summary"
      description="ملخص مالي للفترة من الفواتير، المدفوعات، المصروفات، والتدفق النقدي الحالي."
      action={<Button variant="secondary" onClick={() => downloadCsv('financial-summary.csv', toFinancialSummaryCsv(report))}>تصدير CSV</Button>}
    >
      <div className="grid gap-3 p-4 md:grid-cols-5">
        <MetricCard label="Invoiced" value={formatMoney(report.invoiced)} helper={`${report.invoicesCount} فواتير`} />
        <MetricCard label="Collected" value={formatMoney(report.paid)} helper={`${report.paymentsCount} مدفوعات`} tone="green" />
        <MetricCard label="Outstanding" value={formatMoney(report.outstanding)} helper="من فواتير الفترة" tone="gold" />
        <MetricCard label="Expenses" value={formatMoney(report.expenses)} helper={`${report.expensesCount} مصروفات`} tone="red" />
        <MetricCard label="Net cash" value={formatMoney(report.netCash)} helper="المقبوض - المصروف" tone={report.netCash >= 0 ? 'green' : 'red'} />
      </div>
      <div className="h-80 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cashflowRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" name="الإيرادات" fill="#0f766e" />
            <Bar dataKey="expenses" name="المصاريف" fill="#e11d48" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ReportCard>
  );
}

function RentRollSection({ rows }: Readonly<{ rows: RentRollRow[] }>) {
  return (
    <ReportCard
      title="2. Rent Roll"
      description="قائمة الإيجارات من العقود الحالية فقط، مع روابط آمنة لتفاصيل العقود."
      action={<Button variant="secondary" onClick={() => downloadCsv('rent-roll.csv', rows)}>تصدير CSV</Button>}
    >
      <div className="overflow-x-auto">
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

function OverdueInvoicesSection({ rows }: Readonly<{ rows: OverdueInvoiceReportRow[] }>) {
  return (
    <ReportCard
      title="3. Overdue Invoices"
      description="الفواتير المتأخرة المحسوبة من خدمة arrears الحالية حسب as-of date."
      action={<Button variant="secondary" onClick={() => downloadCsv('overdue-invoices.csv', rows)}>تصدير CSV</Button>}
    >
      <div className="overflow-x-auto">
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

function AgedReceivablesSection({ report }: Readonly<{ report: NonNullable<ReturnType<typeof useAgedReceivablesReport>['data']> | undefined }>) {
  const rows = report?.rows ?? [];

  return (
    <ReportCard
      title="4. Aged Receivables"
      description="تقادم الذمم حسب العقود والفئات العمرية الآمنة من خدمة التقارير الحالية."
      action={<Button variant="secondary" onClick={() => downloadCsv('aged-receivables.csv', rows.map((row) => ({ contractId: row.contractId, tenantName: row.tenantName, totalOutstanding: row.totalOutstanding, totalOverdue: row.totalOverdue, invoiceCount: row.invoiceCount })))}>تصدير CSV</Button>}
    >
      <div className="grid gap-3 p-4 md:grid-cols-5">
        {agingBucketKeys.map((key) => {
          const bucket = report?.buckets[key];
          return <MetricCard key={key} label={bucket?.label ?? key} value={formatMoney(bucket?.total ?? 0)} helper={`${bucket?.invoiceCount ?? 0} فواتير`} tone={key === 'current' ? 'green' : 'gold'} />;
        })}
      </div>
      <div className="overflow-x-auto">
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

function DailyCollectionSection({ rows, receiptRows }: Readonly<{
  rows: DailyCollectionReportRow[];
  receiptRows: Array<{ id: string; receipt_number: string; payment_date: string; amount: number; tenant_name: string | null }>;
}>) {
  return (
    <ReportCard
      title="5. Daily Collection"
      description="تحصيل يومي من خدمة payments الحالية، وروابط الإيصالات تستخدم /receipts?receiptId=<id> فقط."
      action={<Button variant="secondary" onClick={() => downloadCsv('daily-collection.csv', toDailyCollectionCsv(rows))}>تصدير CSV</Button>}
    >
      <div className="overflow-x-auto">
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
            <p className="text-xs text-muted-foreground">من أحدث {latestReceiptLimit} إيصال عبر خدمة الإيصالات الحالية؛ الرابط يستخدم query string فقط.</p>
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

export function ReportsPage() {
  const [filters, setFilters] = useState<FilterState>(() => getCurrentMonthFilters());
  const financialFilters = useMemo(() => ({ dateFrom: filters.from, dateTo: filters.to }), [filters.from, filters.to]);
  const arrearsFilters = useMemo(() => ({ asOf: filters.asOf }), [filters.asOf]);

  const financialSummaryQuery = useFinancialPeriodSummaryReport(financialFilters);
  const financialCashflowQuery = useFinancialCashflowReport(financialFilters);
  const dailyCollectionQuery = useDailyCollectionReport(financialFilters);
  const overdueInvoicesQuery = useOverdueInvoicesReport(arrearsFilters);
  const agedReceivablesQuery = useAgedReceivablesReport(arrearsFilters);
  const contractsQuery = useContracts({ status: 'all' });
  const receiptsQuery = useReceipts({ limit: latestReceiptLimit });

  const rentRollRows = useMemo(() => buildRentRollRows(contractsQuery.data ?? [], contractStatusLabels), [contractsQuery.data]);
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
    || overdueInvoicesQuery.isLoading
    || agedReceivablesQuery.isLoading
    || contractsQuery.isLoading
    || receiptsQuery.isLoading;
  const firstError = financialSummaryQuery.error
    ?? financialCashflowQuery.error
    ?? dailyCollectionQuery.error
    ?? overdueInvoicesQuery.error
    ?? agedReceivablesQuery.error
    ?? contractsQuery.error
    ?? receiptsQuery.error;

  return (
    <div className="space-y-6" dir="rtl">
      <FiltersPanel filters={filters} onChange={setFilters} onResetCurrentMonth={() => setFilters(getCurrentMonthFilters())} />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <CalendarDays className="size-4 text-primary" />
        <span className="text-sm font-bold text-muted-foreground">مدعوم الآن:</span>
        {supportedReportNames.map((name) => <StatusBadge key={name} tone="green">{name}</StatusBadge>)}
      </div>

      {firstError ? <Card><CardContent className="p-4 text-sm text-destructive">{getErrorMessage(firstError, 'تعذر تحميل بعض التقارير')}</CardContent></Card> : null}
      {isLoading ? <Card><CardContent className="p-4 text-sm text-muted-foreground">جاري تحميل التقارير...</CardContent></Card> : null}

      <FinancialSummarySection summary={financialSummaryQuery.data} cashflowRows={financialCashflowQuery.data?.rows ?? []} />
      <RentRollSection rows={rentRollRows} />
      <OverdueInvoicesSection rows={overdueInvoicesQuery.data?.rows ?? []} />
      <AgedReceivablesSection report={agedReceivablesQuery.data} />
      <DailyCollectionSection rows={dailyCollectionQuery.data?.rows ?? []} receiptRows={receiptRows} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Deferred reports">
        {deferredReports.map((report) => <DeferredReportCard key={report.title} title={report.title} reason={report.reason} />)}
      </section>
    </div>
  );
}
