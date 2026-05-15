const unpaidStatusLabel = 'غير مدفوعة';

export const invoiceStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  issued: unpaidStatusLabel,
  unpaid: unpaidStatusLabel,
  partial: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  paid: 'مدفوعة',
  void: 'ملغاة',
};

export function formatInvoiceStatusLabel(status: string) {
  return invoiceStatusLabels[status] ?? status;
}
