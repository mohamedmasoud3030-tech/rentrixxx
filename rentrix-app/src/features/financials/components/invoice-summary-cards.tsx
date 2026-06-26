import type { InvoiceSummary } from '../invoices/invoiceService';
import { formatMoney } from './financials-formatters';

type InvoiceSummaryCardsProps = {
  summary: InvoiceSummary;
};

export function InvoiceSummaryCards({ summary }: InvoiceSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">عدد الفواتير</p>
        <p className="mt-2 text-2xl font-black">{summary.count}</p>
      </div>
      <div className="rounded-2xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
        <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalAmount)}</p>
      </div>
      <div className="rounded-2xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
        <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalPaid)}</p>
      </div>
      <div className="rounded-2xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">إجمالي المتبقي</p>
        <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalRemaining)}</p>
      </div>
    </div>
  );
}
