
const ARABIC_INDIC_DIGITS: { [key: string]: string } = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

const ENGLISH_DIGITS: { [key: string]: string } = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

export function toEnglishDigits(input: string | number): string {
  return String(input).replace(/[٠-٩]/g, (d) => ENGLISH_DIGITS[d]);
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
    POSTED: 'مرحّل', VOID: 'ملغى'
};

export const UNIT_STATUS_AR: Record<string, string> = {
    AVAILABLE: 'شاغرة', RENTED: 'مؤجرة', MAINTENANCE: 'صيانة', ON_HOLD: 'معلقة'
};

export const CHANNEL_AR: Record<string, string> = {
    CASH: 'نقدي', BANK: 'تحويل بنكي', POS: 'شبكة', CHECK: 'شيك', OTHER: 'أخرى'
};

export const EXPENSE_STATUS_AR: Record<string, string> = {
    POSTED: 'مرحّل', VOID: 'ملغى'
};