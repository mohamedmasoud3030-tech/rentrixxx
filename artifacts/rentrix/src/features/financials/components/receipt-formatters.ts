export const paymentMethodLabels: Record<string, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
  check: 'شيك',
  other: 'أخرى',
};

export const receiptStatusLabels: Record<string, string> = {
  posted: 'مرحّل',
};

export function formatReceiptContext(receipt: { tenant_name: string | null; unit_number: string | null; property_title: string | null }) {
  const parts = [receipt.tenant_name, receipt.unit_number ? `وحدة ${receipt.unit_number}` : null, receipt.property_title].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}
