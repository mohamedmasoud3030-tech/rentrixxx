
const ARABIC_INDIC_DIGITS: { [key: string]: string } = {
  '0': 'Ù ', '1': 'Ù¡', '2': 'Ù¢', '3': 'Ù£', '4': 'Ù¤',
  '5': 'Ù¥', '6': 'Ù¦', '7': 'Ù§', '8': 'Ù¨', '9': 'Ù©'
};

const ENGLISH_DIGITS: { [key: string]: string } = {
  'Ù ': '0', 'Ù¡': '1', 'Ù¢': '2', 'Ù£': '3', 'Ù¤': '4',
  'Ù¥': '5', 'Ù¦': '6', 'Ù§': '7', 'Ù¨': '8', 'Ù©': '9'
};

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

export function toEnglishDigits(input: string | number): string {
  return String(input)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٫]/g, '.')
    .replace(/[٬،]/g, '');
}

export function formatCurrency(amount: number, currency: 'OMR' | 'SAR' | 'EGP' = 'OMR'): string {
  const n = Number(amount) || 0;
  const decimals = currency === 'EGP' ? 2 : 3;
  const symbol = currency === 'OMR' ? 'Ø±.Ø¹.' : currency === 'SAR' ? 'Ø±.Ø³.' : 'Ø¬.Ù….';
  
  const formattedNumber = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${toArabicDigits(formattedNumber)} ${symbol}`;
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
        case 'RENTED':
        case 'PAID':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'INACTIVE':
        case 'PENDING':
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
    PAID: 'Ù…Ø¯ÙÙˆØ¹Ø©', UNPAID: 'ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©', PARTIALLY_PAID: 'Ù…Ø¯ÙÙˆØ¹Ø© Ø¬Ø²Ø¦ÙŠØ§Ù‹', OVERDUE: 'Ù…ØªØ£Ø®Ø±Ø©'
};

export const INVOICE_TYPE_AR: Record<string, string> = {
    RENT: 'Ø¥ÙŠØ¬Ø§Ø±', MAINTENANCE: 'ØµÙŠØ§Ù†Ø©', UTILITY: 'Ø®Ø¯Ù…Ø§Øª', LATE_FEE: 'Ø±Ø³ÙˆÙ… ØªØ£Ø®ÙŠØ±'
};

export const CONTRACT_STATUS_AR: Record<string, string> = {
    ACTIVE: 'Ù†Ø´Ø·', ENDED: 'Ù…Ù†ØªÙ‡ÙŠ', SUSPENDED: 'Ù…Ø¹Ù„Ù‚'
};

export const TENANT_STATUS_AR: Record<string, string> = {
    ACTIVE: 'Ù†Ø´Ø·', INACTIVE: 'ØºÙŠØ± Ù†Ø´Ø·', BLACKLIST: 'Ù‚Ø§Ø¦Ù…Ø© Ø³ÙˆØ¯Ø§Ø¡'
};

export const USER_ROLE_AR: Record<string, string> = {
    ADMIN: 'Ù…Ø¯ÙŠØ±', USER: 'Ù…Ø³ØªØ®Ø¯Ù…'
};

export const RECEIPT_STATUS_AR: Record<string, string> = {
    POSTED: 'Ù…Ø±Ø­Ù‘Ù„', VOID: 'Ù…Ù„ØºÙ‰'
};

export const UNIT_STATUS_AR: Record<string, string> = {
    AVAILABLE: 'Ø´Ø§ØºØ±Ø©', RENTED: 'Ù…Ø¤Ø¬Ø±Ø©', MAINTENANCE: 'ØµÙŠØ§Ù†Ø©', ON_HOLD: 'Ù…Ø¹Ù„Ù‚Ø©'
};

export const CHANNEL_AR: Record<string, string> = {
    CASH: 'Ù†Ù‚Ø¯ÙŠ', BANK: 'ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ', POS: 'Ø´Ø¨ÙƒØ©', CHECK: 'Ø´ÙŠÙƒ', OTHER: 'Ø£Ø®Ø±Ù‰'
};

export const EXPENSE_STATUS_AR: Record<string, string> = {
    POSTED: 'Ù…Ø±Ø­Ù‘Ù„', VOID: 'Ù…Ù„ØºÙ‰'
};

export function normalizeArabicNumerals(value: string): string {
    return value.replace(/[Ù -Ù©]/g, (d) => String('Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©'.indexOf(d)));
}
