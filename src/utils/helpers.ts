const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '0': '\u0660',
  '1': '\u0661',
  '2': '\u0662',
  '3': '\u0663',
  '4': '\u0664',
  '5': '\u0665',
  '6': '\u0666',
  '7': '\u0667',
  '8': '\u0668',
  '9': '\u0669',
};

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DECIMAL_SEPARATOR = '\u066B';
const ARABIC_THOUSANDS_SEPARATOR = '\u066C';

const CURRENCY_SYMBOLS: Record<'OMR' | 'SAR' | 'EGP', string> = {
  OMR: '\u0631.\u0639.',
  SAR: '\u0631.\u0633.',
  EGP: '\u062C.\u0645.',
};

const CURRENCY_DECIMALS: Record<'OMR' | 'SAR' | 'EGP', number> = {
  OMR: 3,
  SAR: 3,
  EGP: 2,
};

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

export function toEnglishDigits(input: string | number): string {
  return String(input)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(new RegExp(`[${ARABIC_DECIMAL_SEPARATOR}]`, 'g'), '.')
    .replace(new RegExp(`[${ARABIC_THOUSANDS_SEPARATOR}،]`, 'g'), '');
}

export function normalizeLocalizedNumber(value: unknown): string {
  if (value === null || value === undefined) return '';

  const normalized = String(value)
    .trim()
    .replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(new RegExp(`[${ARABIC_DECIMAL_SEPARATOR}]`, 'g'), '.')
    .replace(new RegExp(`[${ARABIC_THOUSANDS_SEPARATOR}\u00A0\\s]`, 'g'), '')
    .replace(/,/g, '.')
    .replace(/[^0-9.+-]/g, '');

  if (!normalized) return '';

  const sign = normalized.startsWith('-') ? '-' : normalized.startsWith('+') ? '+' : '';
  const unsigned = normalized.replace(/^[+-]/, '').replace(/[+-]/g, '');
  const [intPart = '', ...fractionParts] = unsigned.split('.');
  const decimalPart = fractionParts.join('');
  const safeInt = intPart.replace(/\D/g, '');
  const safeDecimal = decimalPart.replace(/\D/g, '');

  if (!safeInt && !safeDecimal) return '';
  return safeDecimal.length > 0 ? `${sign}${safeInt || '0'}.${safeDecimal}` : `${sign}${safeInt || '0'}`;
}

export function parseLocalizedNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = normalizeLocalizedNumber(value);
  if (!normalized || normalized === '-' || normalized === '+') return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: unknown, fractionDigits = 2): string {
  const normalizedDigits = Number.isFinite(fractionDigits) ? Math.max(0, Math.min(6, Math.floor(fractionDigits))) : 2;
  const parsed = parseLocalizedNumber(value);

  const formattedNumber = parsed.toLocaleString('en-US', {
    minimumFractionDigits: normalizedDigits,
    maximumFractionDigits: normalizedDigits,
  });

  return toArabicDigits(formattedNumber);
}

export function formatCurrency(amount: unknown, currency: 'OMR' | 'SAR' | 'EGP' = 'OMR'): string {
  const safeCurrency = currency in CURRENCY_SYMBOLS ? currency : 'OMR';
  const decimals = CURRENCY_DECIMALS[safeCurrency];
  const formattedNumber = formatNumber(amount, decimals).replace(/\s.+$/, '');
  return `${formattedNumber} ${CURRENCY_SYMBOLS[safeCurrency]}`;
}

export function formatMoney(amount: unknown, currency: 'OMR' | 'SAR' | 'EGP' = 'OMR'): string {
  return formatCurrency(amount, currency);
}

// Convert Gregorian date to Hijri date
export function toHijri(date: Date): { day: number; month: number; year: number } {
  const jd = Math.floor((date.getTime() / 86400000) + date.getTimezoneOffset() / 1440 + 1948439.5);
  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  return { day: Math.floor(day), month: Math.floor(month), year: Math.floor(year) };
}

// Convert Hijri date to Gregorian date
export function toGregorian(hijriDay: number, hijriMonth: number, hijriYear: number): Date {
  const n = hijriDay + Math.ceil(29.5001 * (hijriMonth - 1)) + (hijriYear - 1) * 354 + Math.floor((3 + 11 * hijriYear) / 30) - Math.floor((hijriYear / 100) * 0.97);
  const q = Math.floor(n / 36524.25);
  const r = n % 36524.25;
  const s = Math.floor(r / 365.2425);
  const t = (r % 365.2425 + 0.5) / 365.2425;
  const u = Math.floor((q * 36524 + s * 365.25 + t) / 36525);
  const v = Math.floor(((q * 36524 + s * 365.25 + t) % 36525) / 365.25);
  const w = Math.floor(((q * 36524 + s * 365.25 + t) % 365.25) / 30.44);
  const x = Math.floor(((q * 36524 + s * 365.25 + t) % 30.44) + 0.5);
  const timestamp = Math.floor(new Date(2000 + u - 30, w, x).getTime());
  return new Date(timestamp);
}

// Format date with calendar type option
export function formatDateWithType(dateString: string, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string {
  if (!dateString) return 'â€”';
  try {
    const date = new Date(dateString);
    
    if (calendarType === 'hijri') {
      const hijri = toHijri(date);
      const day = toArabicDigits(hijri.day.toString().padStart(2, '0'));
      const month = toArabicDigits(hijri.month.toString().padStart(2, '0'));
      const year = toArabicDigits(hijri.year.toString());
      return `${year}/${month}/${day}`;
    } else {
      // Gregorian
      const day = toArabicDigits(date.getDate().toString().padStart(2, '0'));
      const month = toArabicDigits((date.getMonth() + 1).toString().padStart(2, '0'));
      const year = toArabicDigits(date.getFullYear().toString());
      return `${year}/${month}/${day}`;
    }
  } catch {
    return dateString;
  }
}

export function formatDate(dateString: string): string {
  return formatDateWithType(dateString, 'gregorian');
}

export function formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return 'â€”';
    try {
        const date = new Date(dateTimeString);
        const formattedDate = formatDate(dateTimeString);
        const time = date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
        return `${formattedDate} ${time}`;
    } catch {
        return dateTimeString;
    }
}

export function formatDateTimeWithType(dateTimeString: string, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string {
    if (!dateTimeString) return 'â€”';
    try {
        const date = new Date(dateTimeString);
        const formattedDate = formatDateWithType(dateTimeString, calendarType);
        const time = date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
        return `${formattedDate} ${time}`;
    } catch {
        return dateTimeString;
    }
}

export function getStatusBadgeClass(status: string): string {
    switch (status) {
        case 'ACTIVE':
        case 'POSTED':
        case 'COMPLETED':
        case 'Completed':
        case 'RENTED':
        case 'PAID':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'INACTIVE':
        case 'PENDING':
        case 'Pending':
        case 'IN_PROGRESS':
        case 'ON_HOLD':
        case 'PARTIALLY_PAID':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'ENDED':
        case 'SUSPENDED':
        case 'VOID':
        case 'BLACKLIST':
        case 'CLOSED':
        case 'OVERDUE':
        case 'NOT_INTERESTED':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case 'NEW':
        case 'CONTACTED':
        case 'INTERESTED':
             return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Removes +, -, spaces, parentheses and any non-digit characters
  return phone.replace(/[\s+()-]/g, '');
}

export const safeLabel = (map: {[key: string]: string}, key: string, fallback: string) => map[key] || fallback;

export const INVOICE_ROUNDING_EPSILON = 0.001;

export function getInvoiceTotal(invoice: { amount?: number; taxAmount?: number }): number {
  return Number((Number(invoice.amount || 0) + Number(invoice.taxAmount || 0)).toFixed(3));
}

export function getInvoiceRemaining(invoice: { amount?: number; taxAmount?: number; paidAmount?: number }): number {
  const total = getInvoiceTotal(invoice);
  const paid = Number(invoice.paidAmount || 0);
  return Math.max(0, Number((total - paid).toFixed(3)));
}

export function getEffectiveInvoiceStatus(
  invoice: { dueDate: string; amount?: number; taxAmount?: number; paidAmount?: number },
  graceDays = 0,
  now: Date = new Date(),
): 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' {
  const total = getInvoiceTotal(invoice);
  const paid = Number(invoice.paidAmount || 0);
  if (paid >= total - INVOICE_ROUNDING_EPSILON) return 'PAID';
  const dueWithGrace = new Date(invoice.dueDate);
  dueWithGrace.setDate(dueWithGrace.getDate() + Math.max(0, graceDays || 0));
  if (dueWithGrace.getTime() < now.getTime()) return 'OVERDUE';
  if (paid > INVOICE_ROUNDING_EPSILON) return 'PARTIALLY_PAID';
  return 'UNPAID';
}

export function exportToCsv(filename: string, rows: Record<string, string | number | null | undefined>[]): void {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row => headers.map(h => {
            const val = row[h];
            const str = val == null ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
        }).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}


export const INVOICE_STATUS_AR: Record<string, string> = {
    PAID: 'مدفوعة', UNPAID: 'غير مدفوعة', PARTIALLY_PAID: 'مدفوعة جزئياً', OVERDUE: 'متأخرة'
};

export const INVOICE_TYPE_AR: Record<string, string> = {
    RENT: 'إيجار', MAINTENANCE: 'صيانة', UTILITY: 'خدمات', LATE_FEE: 'رسوم تأخير'
};

export const CONTRACT_STATUS_AR: Record<string, string> = {
    ACTIVE: 'نشط', ENDED: 'منتهي', SUSPENDED: 'معلق'
};

export const TENANT_STATUS_AR: Record<string, string> = {
    ACTIVE: 'نشط', INACTIVE: 'غير نشط', BLACKLIST: 'قائمة سوداء'
};

export const USER_ROLE_AR: Record<string, string> = {
    ADMIN: 'مدير', USER: 'مستخدم'
};

export const RECEIPT_STATUS_AR: Record<string, string> = {
    POSTED: 'مرحل', VOID: 'ملغى'
};

export const UNIT_STATUS_AR: Record<string, string> = {
    AVAILABLE: 'شاغرة', RENTED: 'مؤجرة', MAINTENANCE: 'صيانة', ON_HOLD: 'معلقة'
};

export const CHANNEL_AR: Record<string, string> = {
    CASH: 'نقدي', BANK: 'تحويل بنكي', POS: 'شبكة', CHECK: 'شيك', OTHER: 'أخرى'
};

export const EXPENSE_STATUS_AR: Record<string, string> = {
    POSTED: 'مرحل', VOID: 'ملغى'
};

export function normalizeArabicNumerals(value: string): string {
    return normalizeLocalizedNumber(value);
}
