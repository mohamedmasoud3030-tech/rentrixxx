import {
  defaultCompanySettingsContract,
  normalizeCompanySettingsContract,
  type CompanyLocalSettings,
  type CompanySettingsContract,
} from './companySettings';
import { formatMoney } from './formatters';

type CompanyFormatterSettings = Partial<CompanyLocalSettings & Pick<CompanySettingsContract, 'locale'>> | null | undefined;

export function getCompanyLocale(settings: CompanyFormatterSettings) {
  return normalizeCompanySettingsContract(settings).locale;
}

export function formatCompanyMoney(settings: CompanyFormatterSettings, amount: number | null | undefined) {
  const normalized = normalizeCompanySettingsContract(settings);
  return formatMoney({ amount, currency: normalized.defaultCurrency, locale: normalized.locale });
}

export function formatDefaultCompanyMoney(amount: number | null | undefined) {
  return formatCompanyMoney(defaultCompanySettingsContract, amount);
}

export function formatCompanyDate(settings: CompanyFormatterSettings, value: string | number | Date) {
  const normalized = normalizeCompanySettingsContract(settings);
  return new Date(value).toLocaleDateString(normalized.locale, { timeZone: normalized.timezone });
}
