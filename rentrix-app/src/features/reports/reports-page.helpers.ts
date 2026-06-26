import type { ContractListItem } from '@/features/contracts/services/contractService';
import type { DailyCollectionReportRow, OverdueInvoicesReport } from '@/features/financials/reports/financialReportsService';
import type { Unit } from '@/types/domain';

export type AgingBucketChartRow = { bucket: string; total: number; invoiceCount: number };
export type OccupancyChartRow = {
  /** Display label — property title when available, otherwise 'عقار بدون اسم'. */
  property: string;
  /** Raw, full property id. Used as a small helper text under the label. */
  propertyId: string;
  /** Short id (first 8 chars) used as a tiny secondary helper when no title. */
  shortPropertyId: string;
  /** Whether the row is showing the title or the unnamed fallback. */
  hasTitle: boolean;
  occupied: number;
  vacant: number;
};
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

export function buildOccupancyRows(
  units: Pick<Unit, 'property_id' | 'status'>[] = [],
  properties: ReadonlyMap<string, string> | readonly { id: string; title: string | null }[] = new Map(),
): OccupancyChartRow[] {
  const titleById: ReadonlyMap<string, string> =
    properties instanceof Map
      ? properties
      : new Map(
          (properties as readonly { id: string; title: string | null }[])
            .map((p) => [p.id, (p.title ?? '').trim()] as const)
            .filter(([, title]) => title.length > 0),
        );

  const rowsByProperty = new Map<string, OccupancyChartRow>();

  for (const unit of units) {
    const id = unit.property_id;
    const title = titleById.get(id);
    const hasTitle = Boolean(title);
    const existing = rowsByProperty.get(id);
    if (existing) {
      if (unit.status === 'occupied') existing.occupied += 1;
      else existing.vacant += 1;
      continue;
    }
    const row: OccupancyChartRow = {
      property: hasTitle ? title! : 'عقار بدون اسم',
      propertyId: id,
      shortPropertyId: id.slice(0, 8),
      hasTitle,
      occupied: unit.status === 'occupied' ? 1 : 0,
      vacant: unit.status === 'occupied' ? 0 : 1,
    };
    rowsByProperty.set(id, row);
  }

  // Prefer titled rows first, then sort titled rows by Arabic title; untitled
  // rows sort by short id so the order is stable.
  return Array.from(rowsByProperty.values()).sort((a, b) => {
    if (a.hasTitle !== b.hasTitle) return a.hasTitle ? -1 : 1;
    return a.property.localeCompare(b.property, 'ar') || a.shortPropertyId.localeCompare(b.shortPropertyId);
  });
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

export function buildAgingBucketChartRows(
  buckets: Record<string, { label: string; total: number; invoiceCount: number }> | undefined,
  bucketKeys: string[],
): AgingBucketChartRow[] {
  return bucketKeys.map((key) => {
    const bucket = buckets?.[key];
    return {
      bucket: bucket?.label ?? key,
      total: bucket?.total ?? 0,
      invoiceCount: bucket?.invoiceCount ?? 0,
    };
  });
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
