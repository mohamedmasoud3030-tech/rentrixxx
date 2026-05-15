import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgedReceivablesReport, ArrearsSummaryReport, OverdueInvoicesReport } from '../reports/financialReportsService';
import { ArrearsAgingBuckets } from './arrears-aging-buckets';
import { ArrearsFilters } from './arrears-filters';
import { ArrearsSummaryCards } from './arrears-summary-cards';
import { filterOverdueInvoiceRows, type ArrearsBucketFilter } from './arrears-workflow-helpers';
import { formatDate, getErrorMessage } from './financials-formatters';
import { OverdueInvoicesTable, SelectedOverdueInvoiceCard } from './overdue-invoices-table';

type ArrearsWorkflowSectionProps = {
  asOf: string;
  search: string;
  bucketFilter: ArrearsBucketFilter;
  overdueReport: OverdueInvoicesReport | undefined;
  agedReceivablesReport: AgedReceivablesReport | undefined;
  arrearsSummaryReport: ArrearsSummaryReport | undefined;
  selectedInvoiceId: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onAsOfChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onBucketFilterChange: (value: ArrearsBucketFilter) => void;
  onSelectInvoice: (invoiceId: string) => void;
};

export function ArrearsWorkflowSection({
  asOf,
  search,
  bucketFilter,
  overdueReport,
  agedReceivablesReport,
  arrearsSummaryReport,
  selectedInvoiceId,
  isLoading,
  isError,
  error,
  onAsOfChange,
  onSearchChange,
  onBucketFilterChange,
  onSelectInvoice,
}: ArrearsWorkflowSectionProps) {
  const overdueRows = overdueReport?.rows ?? [];
  const filteredRows = filterOverdueInvoiceRows(overdueRows, search, bucketFilter);
  const selectedOverdueRow = overdueRows.find((row) => row.invoiceId === selectedInvoiceId);
  const hasFilters = search.trim().length > 0 || bucketFilter !== 'all';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="space-y-2">
        <CardTitle>Workflow تحصيل المتأخرات</CardTitle>
        <p className="text-sm text-muted-foreground">
          سطح قراءة فقط لمتابعة المتأخرات حسب تاريخ الاستحقاق حتى {formatDate(asOf)} دون تنفيذ مدفوعات أو إرسال رسائل.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ArrearsFilters
          asOf={asOf}
          search={search}
          bucketFilter={bucketFilter}
          onAsOfChange={onAsOfChange}
          onSearchChange={onSearchChange}
          onBucketFilterChange={onBucketFilterChange}
        />

        {isLoading ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">جارٍ تحميل Workflow تحصيل المتأخرات...</div> : null}
        {isError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
            {getErrorMessage(error, 'تعذر تحميل تقارير المتأخرات')}
          </div>
        ) : null}

        {!isError ? (
          <>
            <ArrearsSummaryCards overdueReport={overdueReport} agedReceivablesReport={agedReceivablesReport} arrearsSummaryReport={arrearsSummaryReport} />
            <ArrearsAgingBuckets agedReceivablesReport={agedReceivablesReport} />
          </>
        ) : null}

        {!isLoading && !isError && overdueRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">لا توجد فواتير متأخرة حتى تاريخ التقرير الحالي.</div>
        ) : null}

        {!isLoading && !isError && overdueRows.length > 0 && filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">لا توجد صفوف مطابقة لفلاتر التحصيل الحالية.</div>
        ) : null}

        {!isLoading && !isError && filteredRows.length > 0 ? (
          <OverdueInvoicesTable rows={filteredRows} selectedInvoiceId={selectedInvoiceId} onSelectInvoice={onSelectInvoice} />
        ) : null}

        {!isLoading && !isError && (overdueRows.length > 0 || hasFilters) ? (
          <SelectedOverdueInvoiceCard row={selectedOverdueRow} onShowInvoice={onSelectInvoice} />
        ) : null}
      </CardContent>
    </Card>
  );
}
