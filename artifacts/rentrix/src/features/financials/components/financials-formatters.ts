import { formatCompanyDate, formatDefaultCompanyMoney } from '@lib/format';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { toFinancialNumber } from '../financialMath';

export function formatMoney(value: number | null | undefined) {
  return formatDefaultCompanyMoney(toFinancialNumber(value));
}

export function formatDate(value: string | number | Date) {
  return formatCompanyDate(defaultCompanyLocalSettings, value);
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function formatShortId(value: string | null | undefined) {
  return value ? `#${value.slice(0, 8)}` : '—';
}

export { formatInvoiceStatusLabel, invoiceStatusLabels } from './invoice-status-labels';