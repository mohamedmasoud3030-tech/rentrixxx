import { toFinancialNumber } from '../financialMath';
import type { AgingBucketKey, OverdueInvoiceReportRow } from '../reports/financialReportsService';

export const ARABIC_LOCALE = 'ar';
export const EMPTY_FIELD_VALUE = '—';
export const OVER_90_BUCKET_KEY = 'days_90_plus' satisfies AgingBucketKey;

export const arrearsBucketKeys = ['current', 'days_1_30', 'days_31_60', 'days_61_90', OVER_90_BUCKET_KEY] as const satisfies AgingBucketKey[];

export type ArrearsBucketFilter = AgingBucketKey | 'all';

const allBucketsOption = { value: 'all', label: 'كل الأعمار' } as const;

export const arrearsBucketLabels: Record<AgingBucketKey, string> = {
  current: 'حالي',
  days_1_30: '1–30 يوم',
  days_31_60: '31–60 يوم',
  days_61_90: '61–90 يوم',
  [OVER_90_BUCKET_KEY]: '90+ يوم',
};

export const arrearsBucketOptions: { value: ArrearsBucketFilter; label: string }[] = [
  allBucketsOption,
  ...arrearsBucketKeys.map((bucketKey) => ({ value: bucketKey, label: arrearsBucketLabels[bucketKey] })),
];

export function getArrearsBucketLabel(bucket: AgingBucketKey) {
  return arrearsBucketLabels[bucket];
}

export function getBucketKeyFromDaysOverdue(daysOverdue: number | null | undefined): AgingBucketKey {
  const safeDays = toFinancialNumber(daysOverdue);
  if (safeDays <= 0) return 'current';
  if (safeDays <= 30) return 'days_1_30';
  if (safeDays <= 60) return 'days_31_60';
  if (safeDays <= 90) return 'days_61_90';
  return OVER_90_BUCKET_KEY;
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

function getOverdueInvoiceSearchValues(row: OverdueInvoiceReportRow) {
  return [
    row.invoiceId,
    row.shortInvoiceId,
    row.tenantName,
    row.propertyTitle,
    row.unitNumber,
    row.contractId,
  ];
}

function rowMatchesSearch(row: OverdueInvoiceReportRow, normalizedSearch: string) {
  if (!normalizedSearch) return true;
  return getOverdueInvoiceSearchValues(row).some((value) => value?.toLocaleLowerCase(ARABIC_LOCALE).includes(normalizedSearch));
}

function rowMatchesBucket(row: OverdueInvoiceReportRow, bucketFilter: ArrearsBucketFilter) {
  return bucketFilter === 'all' || getOverdueRowBucketKey(row) === bucketFilter;
}

export function filterOverdueInvoiceRows(rows: OverdueInvoiceReportRow[], search: string, bucketFilter: ArrearsBucketFilter) {
  const normalizedSearch = search.trim().toLocaleLowerCase(ARABIC_LOCALE);
  return rows.filter((row) => rowMatchesBucket(row, bucketFilter) && rowMatchesSearch(row, normalizedSearch));
}
