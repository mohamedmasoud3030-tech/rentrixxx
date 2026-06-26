import { FileSpreadsheet, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatMoney, formatShortId } from '@/features/financials/components/financials-formatters';
import type { DailyCollectionReportRow } from '@/features/financials/reports/financialReportsService';
import { buildReportCsvFilename, downloadCsv, latestReceiptLimit, toDailyCollectionCsv } from '../reports-page.helpers';
import type { RentRollReportRow } from '../reports-page.helpers';
import { createReceiptPrintHref } from '../reports-page.helpers';
import { ReportCard, SafeAnchor } from './common';

type RentRollRow = RentRollReportRow;

export function CollectionsSection({ rows, receiptRows, rentRollRows, isLoading }: Readonly<{
  rows: DailyCollectionReportRow[];
  receiptRows: Array<{ id: string; receipt_number: string; payment_date: string; amount: number; tenant_name: string | null }>;
  rentRollRows: RentRollRow[];
  isLoading: boolean;
}>) {
  return (
    <div className="space-y-4">
      <ReportCard
        title="التحصيل اليومي للفترة"
        description="تفصيل يومي للتحصيل مع تفصيل طرق الدفع لكل يوم."
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('daily-collection'), toDailyCollectionCsv(rows))}><FileSpreadsheet className="me-2 size-4" />تصدير CSV</Button>}
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
        action={<Button variant="secondary" onClick={() => downloadCsv(buildReportCsvFilename('rent-roll'), rentRollRows)}><FileSpreadsheet className="me-2 size-4" />تصدير CSV</Button>}
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
