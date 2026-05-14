import type { DailyCollectionReportRow, OverdueInvoicesReport } from '@/features/financials/reports/financialReportsService';
import type { Unit } from '@/types/domain';

export type OccupancyChartRow = { property: string; occupied: number; vacant: number };
export type PaymentsTrendRow = { month: string; collections: number; overdue: number };

function monthKey(date: string) {
  return date.slice(0, 7);
}

export function buildOccupancyRows(units: Pick<Unit, 'property_id' | 'status'>[] = []): OccupancyChartRow[] {
  const rowsByProperty = new Map<string, OccupancyChartRow>();

  for (const unit of units) {
    const row = rowsByProperty.get(unit.property_id) ?? { property: unit.property_id.slice(0, 8), occupied: 0, vacant: 0 };
    if (unit.status === 'occupied') row.occupied += 1;
    else row.vacant += 1;
    rowsByProperty.set(unit.property_id, row);
  }

  return Array.from(rowsByProperty.values());
}

export function buildPaymentsTrendRows(params: {
  dailyCollections?: DailyCollectionReportRow[];
  overdueInvoices?: OverdueInvoicesReport['rows'];
}): PaymentsTrendRow[] {
  const rowsByMonth = new Map<string, PaymentsTrendRow>();

  for (const row of params.dailyCollections ?? []) {
    const month = monthKey(row.paymentDate);
    const current = rowsByMonth.get(month) ?? { month, collections: 0, overdue: 0 };
    current.collections += row.totalPaid;
    rowsByMonth.set(month, current);
  }

  for (const invoice of params.overdueInvoices ?? []) {
    const month = monthKey(invoice.dueDate);
    const current = rowsByMonth.get(month) ?? { month, collections: 0, overdue: 0 };
    current.overdue += invoice.remainingAmount;
    rowsByMonth.set(month, current);
  }

  return Array.from(rowsByMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}
