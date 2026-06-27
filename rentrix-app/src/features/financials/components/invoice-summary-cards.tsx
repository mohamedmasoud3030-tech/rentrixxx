import { FileText, WalletCards } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import type { InvoiceSummary } from '../invoices/invoiceService';
import { formatMoney } from './financials-formatters';

type InvoiceSummaryCardsProps = {
  summary: InvoiceSummary;
};

export function InvoiceSummaryCards({ summary }: InvoiceSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="عدد الفواتير" value={summary.count} icon={FileText} accent="primary" />
      <KpiCard label="إجمالي الفواتير شامل VAT" value={formatMoney(summary.totalAmount)} icon={WalletCards} accent="sky" />
      <KpiCard label="إجمالي VAT" value={formatMoney(summary.totalTax)} icon={WalletCards} accent="primary" />
      <KpiCard label="إجمالي المدفوع" value={formatMoney(summary.totalPaid)} icon={WalletCards} accent="emerald" />
      <KpiCard label="إجمالي المتبقي" value={formatMoney(summary.totalRemaining)} icon={WalletCards} accent="amber" />
    </div>
  );
}
