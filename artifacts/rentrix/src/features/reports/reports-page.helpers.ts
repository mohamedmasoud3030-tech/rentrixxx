import type { ContractListItem } from '@/features/contracts/services/contractService';
import type { DailyCollectionReportRow, OverdueInvoicesReport } from '@/features/financials/reports/financialReportsService';
import type { Unit } from '@/types/domain';

export type OccupancyChartRow = { property: string; occupied: number; vacant: number };
export type PaymentsTrendRow = { month: string; collections: number; overdue: number };
export type RentRollReportRow = {
  contractId: string;
  tenantName: string;
  propertyTitle: string;
  unitNumber: string;
  rentAmount: number;
  paymentCycle: string;
  statusLabel: string;
  startDate: string;
  endDate: string;
};

export type DeferredReportInfo = { title: string; reason: string };

export const deferredReports: DeferredReportInfo[] = [
  { title: 'Owner Statement', reason: 'مؤجل حتى تتوفر خدمة owner settlements/statement آمنة في الطبقة الحالية بدون تصنيع أرصدة.' },
  { title: 'Tenant Statement', reason: 'مؤجل حتى تتوفر خدمة tenant ledger/statement آمنة في الطبقة الحالية بدون تصنيع كشوف حساب.' },
  { title: 'Trial Balance', reason: 'مؤجل لأن ميزان المراجعة يحتاج Ledger/Chart of Accounts مدعومين بخدمة حالية آمنة.' },
  { title: 'Income Statement', reason: 'مؤجل لأن قائمة الدخل المحاسبية غير مدعومة حاليًا بخدمة reports آمنة مكتملة.' },
  { title: 'Balance Sheet', reason: 'مؤجل لأن الميزانية العمومية تحتاج أرصدة دفتر أستاذ مؤكدة وليست متاحة بأمان الآن.' },
];

const paymentCycleLabels: Record<ContractListItem['payment_cycle'], string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوي',
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() ? value : '—';
}

export function createReceiptPrintHref(receiptId: string) {
  return `/receipts?receiptId=${encodeURIComponent(receiptId)}`;
}

export function buildOccupancyRows(units: Pick<Unit, 'property_id' | 'status'>[] = []): OccupancyChartRow[] {
  const rowsByProperty = new Map<string, OccupancyChartRow>();

  for (const unit of units) {
    const row = rowsByProperty.get(unit.property_id) ?? { property: unit.property_id.slice(0, 8), occupied: 0, vacant: 0 };
    if (unit.status === 'occupied') {
      row.occupied += 1;
    } else {
      row.vacant += 1;
    }
    rowsByProperty.set(unit.property_id, row);
  }

  return Array.from(rowsByProperty.values()).sort((a, b) => a.property.localeCompare(b.property));
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

export function buildRentRollRows(
  contracts: ContractListItem[],
  statusLabels: Record<ContractListItem['status'], string>,
): RentRollReportRow[] {
  return contracts
    .map((contract) => ({
      contractId: contract.id,
      tenantName: valueOrDash(contract.people?.full_name),
      propertyTitle: valueOrDash(contract.properties?.title),
      unitNumber: valueOrDash(contract.units?.unit_number),
      rentAmount: contract.rent_amount,
      paymentCycle: paymentCycleLabels[contract.payment_cycle],
      statusLabel: statusLabels[contract.status],
      startDate: contract.start_date,
      endDate: contract.end_date,
    }))
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName, 'ar') || a.contractId.localeCompare(b.contractId));
}
