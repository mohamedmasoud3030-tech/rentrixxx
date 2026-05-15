import { toFinancialNumber } from '../financialMath';
import type { AgedReceivablesReport, ArrearsSummaryReport, OverdueInvoicesReport } from '../reports/financialReportsService';
import { formatMoney } from './financials-formatters';

type ArrearsSummaryCardsProps = {
  overdueReport: OverdueInvoicesReport | undefined;
  agedReceivablesReport: AgedReceivablesReport | undefined;
  arrearsSummaryReport: ArrearsSummaryReport | undefined;
};

export function ArrearsSummaryCards({ overdueReport, agedReceivablesReport, arrearsSummaryReport }: ArrearsSummaryCardsProps) {
  const totalOverdue = arrearsSummaryReport?.totalOverdue ?? overdueReport?.totalOverdue ?? 0;
  const overdueInvoiceCount = arrearsSummaryReport?.overdueInvoiceCount ?? overdueReport?.invoiceCount ?? 0;
  const averageDaysOverdue = toFinancialNumber(arrearsSummaryReport?.averageDaysOverdue);
  const over90Amount = arrearsSummaryReport?.over90Amount ?? agedReceivablesReport?.buckets.days_90_plus.total ?? 0;
  const over90InvoiceCount = arrearsSummaryReport?.over90InvoiceCount ?? agedReceivablesReport?.buckets.days_90_plus.invoiceCount ?? 0;
  const totalOutstanding = agedReceivablesReport?.totalOutstanding ?? 0;

  const cards = [
    { label: 'إجمالي المتأخرات', value: formatMoney(totalOverdue), tone: 'bg-destructive/10 text-destructive' },
    { label: 'عدد الفواتير المتأخرة', value: overdueInvoiceCount.toLocaleString('ar'), tone: 'bg-muted/40 text-foreground' },
    { label: 'متوسط أيام التأخير', value: `${averageDaysOverdue.toLocaleString('ar', { maximumFractionDigits: 1 })} يوم`, tone: 'bg-muted/40 text-foreground' },
    { label: 'متأخرات 90+ يوم', value: formatMoney(over90Amount), meta: `${over90InvoiceCount.toLocaleString('ar')} فاتورة`, tone: 'bg-amber-500/10 text-amber-700' },
    { label: 'إجمالي المتبقي الموجب', value: formatMoney(totalOutstanding), tone: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border bg-background p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-xl font-black tracking-tight">{card.value}</p>
          {card.meta ? <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${card.tone}`}>{card.meta}</p> : null}
        </div>
      ))}
    </div>
  );
}
