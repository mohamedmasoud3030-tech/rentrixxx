// Professional Formatters - Localization & formatting helpers

export const formatters = {
  // Currency formatting (Arabic locale)
  currency: (amount: number, currency: string = 'ر.س'): string => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount).replace('﷼', currency);
  },

  // Number formatting with Arabic digits
  number: (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  // Date formatting (Arabic)
  date: (timestamp: number | Date, format: 'short' | 'long' = 'short'): string => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: format === 'short' ? '2-digit' : 'long',
      day: '2-digit',
    }).format(date);
  },

  // Time formatting
  time: (timestamp: number | Date): string => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  // Full date-time
  dateTime: (timestamp: number | Date): string => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  // Phone number formatting
  phone: (phone: string): string => {
    return phone?.replace(/(\d{3})(\d{3})(\d{4})/, '+966 $1 $2 $3') || '';
  },

  // Percentage
  percentage: (value: number, decimals: number = 1): string => {
    return formatters.number(value * 100, decimals) + '%';
  },

  // Status text (Arabic)
  status: (status: string): string => {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'نشط',
      'INACTIVE': 'غير نشط',
      'PENDING': 'قيد الانتظار',
      'COMPLETED': 'مكتمل',
      'CANCELLED': 'ملغى',
      'DRAFT': 'مسودة',
      'PAID': 'مدفوع',
      'UNPAID': 'غير مدفوع',
      'PARTIALLY_PAID': 'مدفوع جزئياً',
    };
    return statusMap[status] || status;
  },
};

export default formatters;
