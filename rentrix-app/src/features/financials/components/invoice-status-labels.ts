const unpaidStatusLabel = 'غير مدفوعة';

export const invoiceStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  issued: unpaidStatusLabel,
  UNPAID: unpaidStatusLabel,
  unpaid: unpaidStatusLabel,
  partial: 'مدفوعة جزئياً',
  PARTIALLY_PAID: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  OVERDUE: 'متأخرة',
  paid: 'مدفوعة',
  PAID: 'مدفوعة',
  void: 'ملغاة',
  VOID: 'ملغاة',
};

export function formatInvoiceStatusLabel(status: string) {
  return invoiceStatusLabels[status] ?? status;
}
