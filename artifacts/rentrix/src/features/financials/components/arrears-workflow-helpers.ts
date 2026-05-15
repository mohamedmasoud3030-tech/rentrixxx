import { toFinancialNumber } from '../financialMath';
import type { AgingBucketKey, OverdueInvoiceReportRow } from '../reports/financialReportsService';

export type ArrearsBucketFilter = AgingBucketKey | 'all';

export const arrearsBucketOptions: { value: ArrearsBucketFilter; label: string }[] = [
  { value: 'all', label: 'كل الأعمار' },
  { value: 'current', label: 'حالي' },
  { value: 'days_1_30', label: '1–30 يوم' },
  { value: 'days_31_60', label: '31–60 يوم' },
  { value: 'days_61_90', label: '61–90 يوم' },
  { value: 'days_90_plus', label: '90+ يوم' },
];

const bucketLabels: Record<AgingBucketKey, string> = {
  current: 'حالي',
  days_1_30: '1–30 يوم',
  days_31_60: '31–60 يوم',
  days_61_90: '61–90 يوم',
  days_90_plus: '90+ يوم',
};

export function getArrearsBucketLabel(bucket: AgingBucketKey) {
  return bucketLabels[bucket];
}

export function getBucketKeyFromDaysOverdue(daysOverdue: number | null | undefined): AgingBucketKey {
  const safeDays = toFinancialNumber(daysOverdue);
  if (safeDays <= 0) return 'current';
  if (safeDays <= 30) return 'days_1_30';
  if (safeDays <= 60) return 'days_31_60';
  if (safeDays <= 90) return 'days_61_90';
  return 'days_90_plus';
}

export function getOverdueRowBucketKey(row: Pick<OverdueInvoiceReportRow, 'daysOverdue'> & { bucket?: AgingBucketKey | null }): AgingBucketKey {
  return row.bucket ?? getBucketKeyFromDaysOverdue(row.daysOverdue);
}

export function safePercentage(value: number | null | undefined, total: number | null | undefined) {
  const safeValue = toFinancialNumber(value);
  const safeTotal = toFinancialNumber(total);
  if (safeTotal <= 0) return null;
  const percentage = (safeValue / safeTotal) * 100;
  return Number.isFinite(percentage) ? percentage : null;
}

export function filterOverdueInvoiceRows(rows: OverdueInvoiceReportRow[], search: string, bucketFilter: ArrearsBucketFilter) {
  const normalizedSearch = search.trim().toLocaleLowerCase('ar');

  return rows.filter((row) => {
    const rowBucket = getOverdueRowBucketKey(row);
    if (bucketFilter !== 'all' && rowBucket !== bucketFilter) return false;
    if (!normalizedSearch) return true;

    const searchableValues = [
      row.invoiceId,
      row.shortInvoiceId,
      row.tenantName,
      row.propertyTitle,
      row.unitNumber,
      row.contractId,
    ];

    return searchableValues.some((value) => value?.toLocaleLowerCase('ar').includes(normalizedSearch));
  });
}
