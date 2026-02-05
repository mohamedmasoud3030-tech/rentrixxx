
const ARABIC_INDIC_DIGITS: { [key: string]: string } = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

export function formatCurrency(amount: number, currency: 'OMR' | 'SAR' | 'EGP' = 'OMR'): string {
  const n = Number(amount) || 0;
  const decimals = currency === 'EGP' ? 2 : 3;
  const symbol = currency === 'OMR' ? 'ر.ع.' : currency === 'SAR' ? 'ر.س.' : 'ج.م.';
  
  const formattedNumber = n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${toArabicDigits(formattedNumber)} ${symbol}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const day = toArabicDigits(date.getDate());
    const month = toArabicDigits(date.getMonth() + 1);
    const year = toArabicDigits(date.getFullYear());
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return '—';
    try {
        const date = new Date(dateTimeString);
        const formattedDate = formatDate(dateTimeString);
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

// FIX: Add missing safeLabel helper function
export const safeLabel = (map: {[key: string]: string}, key: string, fallback: string) => map[key] || fallback;