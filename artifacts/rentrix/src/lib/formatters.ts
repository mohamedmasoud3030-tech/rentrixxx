export const supportedCurrencies = ['OMR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'USD', 'EGP'] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];

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

export function formatMoney({ amount, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE, currencyDisplay = 'code' }: MoneyFormatOptions) {
  const safeAmount = Number(amount ?? 0);
  const safeCurrency = normalizeCurrency(currency);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: safeCurrency,
    currencyDisplay,
  }).format(Number.isFinite(safeAmount) ? safeAmount : 0);
}
