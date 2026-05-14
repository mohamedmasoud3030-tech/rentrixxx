import { getLanguageLocale, normalizeCompanyLocalSettings, type CompanyLocalSettings } from './companySettings';
import { formatMoney } from './formatters';

export function getCompanyLocale(settings: Partial<CompanyLocalSettings> | null | undefined) {
  const normalized = normalizeCompanyLocalSettings(settings);
  return getLanguageLocale(normalized.defaultLanguage);
}

export function formatCompanyMoney(settings: Partial<CompanyLocalSettings> | null | undefined, amount: number | null | undefined) {
  const normalized = normalizeCompanyLocalSettings(settings);
  return formatMoney({ amount, currency: normalized.defaultCurrency, locale: getCompanyLocale(normalized) });
}

export function formatCompanyDate(settings: Partial<CompanyLocalSettings> | null | undefined, value: string | number | Date) {
  return new Date(value).toLocaleDateString(getCompanyLocale(settings));
}
