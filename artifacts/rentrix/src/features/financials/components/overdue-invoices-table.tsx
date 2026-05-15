import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { OverdueInvoiceReportRow } from '../reports/financialReportsService';
import { ARABIC_LOCALE, EMPTY_FIELD_VALUE, getArrearsBucketLabel, getOverdueRowBucketKey } from './arrears-workflow-helpers';
import { formatDate, formatInvoiceStatusLabel, formatMoney, formatShortId } from './financials-formatters';

type OverdueInvoicesTableProps = Readonly<{
  rows: OverdueInvoiceReportRow[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
}>;

function getContextLabel(row: OverdueInvoiceReportRow) {
  const parts: string[] = [];
  if (row.propertyTitle) parts.push(row.propertyTitle);
  if (row.unitNumber) parts.push(`وحدة ${row.unitNumber}`);
  return parts.length > 0 ? parts.join(' · ') : EMPTY_FIELD_VALUE;
}

export function OverdueInvoicesTable({ rows, selectedInvoiceId, onSelectInvoice }: OverdueInvoicesTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-background">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفاتورة</TableHead>
              <TableHead>المستأجر</TableHead>
              <TableHead>العقار / الوحدة</TableHead>
              <TableHead>العقد</TableHead>
              <TableHead>الاستحقاق</TableHead>
              <TableHead>أيام التأخير</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>العمر</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isSelected = selectedInvoiceId === row.invoiceId;
              const bucket = getOverdueRowBucketKey(row);
              return (
                <TableRow key={row.invoiceId} className={cn(isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : undefined)}>
                  <TableCell>
                    <button type="button" className="font-black text-primary underline-offset-4 hover:underline" onClick={() => onSelectInvoice(row.invoiceId)}>
                      #{row.shortInvoiceId || row.invoiceId.slice(0, 8)}
                    </button>
                  </TableCell>
                  <TableCell>{row.tenantName ?? EMPTY_FIELD_VALUE}</TableCell>
                  <TableCell>{getContextLabel(row)}</TableCell>
                  <TableCell>{formatShortId(row.contractId)}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>{row.daysOverdue.toLocaleString(ARABIC_LOCALE)}</TableCell>
                  <TableCell>{formatMoney(row.amount)}</TableCell>
                  <TableCell>{formatMoney(row.paidAmount)}</TableCell>
                  <TableCell className="font-black text-destructive">{formatMoney(row.remainingAmount)}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                      {formatInvoiceStatusLabel(row.status)}
                    </span>
                  </TableCell>
                  <TableCell>{getArrearsBucketLabel(bucket)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type SelectedOverdueInvoiceCardProps = Readonly<{
  row: OverdueInvoiceReportRow | undefined;
  onShowInvoice: (invoiceId: string) => void;
}>;

export function SelectedOverdueInvoiceCard({ row, onShowInvoice }: SelectedOverdueInvoiceCardProps) {
  if (!row) {
    return (
      <div className="rounded-3xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
        اختر فاتورة متأخرة من الجدول لعرض تفاصيل التحصيل للقراءة فقط.
      </div>
    );
  }

  const bucket = getOverdueRowBucketKey(row);
  return (
    <div className="rounded-3xl border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground">تفاصيل تحصيل للقراءة فقط</p>
          <h3 className="mt-1 text-lg font-black">فاتورة #{row.shortInvoiceId || row.invoiceId.slice(0, 8)}</h3>
        </div>
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">{getArrearsBucketLabel(bucket)}</span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">المستأجر</dt>
          <dd className="font-bold">{row.tenantName ?? EMPTY_FIELD_VALUE}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">السياق</dt>
          <dd className="font-bold">{getContextLabel(row)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">تاريخ الاستحقاق</dt>
          <dd className="font-bold">{formatDate(row.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">المتبقي</dt>
          <dd className="font-black text-destructive">{formatMoney(row.remainingAmount)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => onShowInvoice(row.invoiceId)}>عرض الفاتورة في قسم الفواتير</Button>
        <p className="text-xs text-muted-foreground">لا توجد إجراءات دفع أو مراسلات في هذا القسم ضمن هذا الإصدار.</p>
      </div>
    </div>
  );
}
