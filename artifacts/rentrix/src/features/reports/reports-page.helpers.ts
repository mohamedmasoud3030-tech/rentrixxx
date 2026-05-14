import type { DailyCollectionReportRow, ExpenseBreakdownReport, OverdueInvoicesReport } from '@/features/financials/reports/financialReportsService';

export type PaymentsTrendRow = { month: string; collections: number; overdue: number };
export type ExpenseBreakdownChartRow = { name: string; value: number; count: number };

function monthKey(date: string) {
  return date.slice(0, 7);
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

export function buildExpenseBreakdownRows(report?: ExpenseBreakdownReport): ExpenseBreakdownChartRow[] {
  return (report?.byCategory ?? []).map((row) => ({ name: row.category, value: row.total, count: row.count }));
}
