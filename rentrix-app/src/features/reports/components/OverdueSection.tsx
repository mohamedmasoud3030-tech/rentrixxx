import { AlertTriangle, FileSpreadsheet, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatInvoiceStatusLabel, formatMoney, formatShortId } from '@/features/financials/components/financials-formatters';
import type { OverdueInvoiceReportRow } from '@/features/financials/reports/financialReportsService';
import { useAgedReceivablesReport } from '@/features/financials/reports/useFinancialReports';
import { agingBucketKeys, buildReportCsvFilename, downloadCsv } from '../reports-page.helpers';
import { buildAgingBucketChartRows } from '../reports-page.helpers';
import { ReportCard, SafeAnchor } from './common';

export function OverdueSection({ rows, agedReport, isLoading }: Readonly<{
  rows: OverdueInvoiceReportRow[];
  agedReport: NonNullable<ReturnType<typeof useAgedReceivablesReport>['data']> | undefined;
  isLoading: boolean;
}>) {
  const bucketRows = buildAgingBucketChartRows(agedReport?.buckets, agingBucketKeys);

  return (
    <div className="space-y-4">
      <ReportCard
        title="الفواتير المتأخرة حسب as-of"
        description="الفواتير المتأخرة المحسوبة من خدمة arrears الحالية حسب تاريخ الاحتساب."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('overdue-invoices'), rows)}><FileSpreadsheet className="me-2 size-4" />تصدير CSV</Button>}
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
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('aged-receivables'), bucketRows.map((row) => ({ bucket: row.bucket, total: row.total, invoiceCount: row.invoiceCount })))}><FileSpreadsheet className="me-2 size-4" />تصدير CSV</Button>}
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
