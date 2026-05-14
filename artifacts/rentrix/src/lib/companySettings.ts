import { DEFAULT_CURRENCY, normalizeCurrency, type SupportedCurrency } from './formatters';

export const supportedLanguages = ['ar', 'en'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type TextDirection = 'rtl' | 'ltr';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';
export const DEFAULT_COUNTRY = 'OM';
export const DEFAULT_TIMEZONE = 'Asia/Muscat';
export const DEFAULT_RECEIPT_PREFIX = 'REC';
export const DEFAULT_INVOICE_PREFIX = 'INV';

export type CompanyLocalSettings = {
  companyName: string;
  logoUrl?: string | null;
  defaultLanguage: SupportedLanguage;
  defaultCurrency: SupportedCurrency;
  country: string;
  timezone: string;
  receiptPrefix: string;
  invoicePrefix: string;
};

export const defaultCompanyLocalSettings: CompanyLocalSettings = {
  companyName: 'Rentrix',
  logoUrl: null,
  defaultLanguage: DEFAULT_LANGUAGE,
  defaultCurrency: DEFAULT_CURRENCY,
  country: DEFAULT_COUNTRY,
  timezone: DEFAULT_TIMEZONE,
  receiptPrefix: DEFAULT_RECEIPT_PREFIX,
  invoicePrefix: DEFAULT_INVOICE_PREFIX,
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage);
}

export function normalizeLanguage(value: unknown): SupportedLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageDirection(language: unknown): TextDirection {
  return normalizeLanguage(language) === 'ar' ? 'rtl' : 'ltr';
}

export function getLanguageLocale(language: unknown): string {
  return normalizeLanguage(language);
}

export function normalizeCompanyLocalSettings(value: Partial<CompanyLocalSettings> | null | undefined): CompanyLocalSettings {
  return {
    companyName: value?.companyName?.trim() || defaultCompanyLocalSettings.companyName,
    logoUrl: value?.logoUrl ?? defaultCompanyLocalSettings.logoUrl,
    defaultLanguage: normalizeLanguage(value?.defaultLanguage),
    defaultCurrency: normalizeCurrency(value?.defaultCurrency),
    country: value?.country?.trim() || defaultCompanyLocalSettings.country,
    timezone: value?.timezone?.trim() || defaultCompanyLocalSettings.timezone,
    receiptPrefix: value?.receiptPrefix?.trim() || defaultCompanyLocalSettings.receiptPrefix,
    invoicePrefix: value?.invoicePrefix?.trim() || defaultCompanyLocalSettings.invoicePrefix,
  };
}
