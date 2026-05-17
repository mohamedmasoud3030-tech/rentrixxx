export const supportedCurrencies = ['OMR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'USD', 'EGP'] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];

export type CurrencyMetadata = Readonly<{
  code: SupportedCurrency;
  label: string;
  minorUnit: number;
}>;

export const currencyMetadata = {
  OMR: { code: 'OMR', label: 'Omani Rial', minorUnit: 3 },
  AED: { code: 'AED', label: 'UAE Dirham', minorUnit: 2 },
  SAR: { code: 'SAR', label: 'Saudi Riyal', minorUnit: 2 },
  QAR: { code: 'QAR', label: 'Qatari Riyal', minorUnit: 2 },
  KWD: { code: 'KWD', label: 'Kuwaiti Dinar', minorUnit: 3 },
  BHD: { code: 'BHD', label: 'Bahraini Dinar', minorUnit: 3 },
  USD: { code: 'USD', label: 'US Dollar', minorUnit: 2 },
  EGP: { code: 'EGP', label: 'Egyptian Pound', minorUnit: 2 },
} as const satisfies Record<SupportedCurrency, CurrencyMetadata>;

export const DEFAULT_CURRENCY: SupportedCurrency = 'OMR';
export const DEFAULT_LOCALE = 'ar';

export type MoneyFormatOptions = {
  amount: number | null | undefined;
  currency?: SupportedCurrency | null;
  locale?: string;
  currencyDisplay?: 'symbol' | 'code' | 'name';
};

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && supportedCurrencies.includes(value as SupportedCurrency);
}

export function normalizeCurrency(value: unknown): SupportedCurrency {
  return isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}

export function getCurrencyMetadata(value: unknown): CurrencyMetadata {
  return currencyMetadata[normalizeCurrency(value)];
}

export function getCurrencyMinorUnit(value: unknown): number {
  return getCurrencyMetadata(value).minorUnit;
}

export function formatMoney({ amount, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE, currencyDisplay = 'code' }: MoneyFormatOptions) {
  const safeAmount = Number(amount ?? 0);
  const metadata = getCurrencyMetadata(currency);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: metadata.code,
    currencyDisplay,
    minimumFractionDigits: metadata.minorUnit,
    maximumFractionDigits: metadata.minorUnit,
  }).format(Number.isFinite(safeAmount) ? safeAmount : 0);
}
