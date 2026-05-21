import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CollectionSummaryReport, FinancialReportFilters } from '../reports/financialReportsService';
import { formatDate, formatMoney, getErrorMessage } from '@lib/format';

type FinancialReportsPreviewSectionProps = {
  reportFilters: Pick<FinancialReportFilters, 'dateFrom' | 'dateTo'>;
  collectionSummary: CollectionSummaryReport | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function FinancialReportsPreviewSection({
  reportFilters,
  collectionSummary,
  isLoading,
  isError,
  error,
}: FinancialReportsPreviewSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>التقارير المالية</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          ملخص تحقق للشهر الحالي من {formatDate(reportFilters.dateFrom)} إلى {formatDate(reportFilters.dateTo)}.
        </p>
        {isLoading ? <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">جارٍ تحميل ملخص التقارير...</div> : null}
        {isError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {getErrorMessage(error, 'تعذر تحميل ملخص التقارير')}
          </div>
        ) : null}
        {collectionSummary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">الفواتير</p>
              <p className="mt-1 font-black">{formatMoney(collectionSummary.invoiced)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">المدفوع</p>
              <p className="mt-1 font-black">{formatMoney(collectionSummary.paid)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="mt-1 font-black">{formatMoney(collectionSummary.outstanding)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">الإيصالات</p>
              <p className="mt-1 font-black">{collectionSummary.receiptsCount}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">عدد الفواتير</p>
              <p className="mt-1 font-black">{collectionSummary.invoicesCount}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">المصاريف</p>
              <p className="mt-1 font-black">{formatMoney(collectionSummary.expensesTotal)}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
