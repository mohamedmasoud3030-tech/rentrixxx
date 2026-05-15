import type { ReceiptRecord } from '../receipts/receiptService';
import { formatDate, formatMoney, formatShortId, getErrorMessage } from './financials-formatters';
import { formatReceiptContext, paymentMethodLabels } from './receipt-formatters';

type ReceiptDetailCardProps = {
  selectedReceiptId: string;
  receiptDetail: ReceiptRecord | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function ReceiptDetailCard({ selectedReceiptId, receiptDetail, isLoading, isError, error }: ReceiptDetailCardProps) {
  return (
    <div className="rounded-2xl border p-4">
      <h4 className="font-black">تفاصيل الإيصال</h4>
      {!selectedReceiptId ? <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">اختر إيصالاً لعرض تفاصيله</p> : null}
      {selectedReceiptId && isLoading ? <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">جارٍ تحميل تفاصيل الإيصال...</p> : null}
      {selectedReceiptId && isError ? <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">{getErrorMessage(error, 'تعذر تحميل تفاصيل الإيصال')}</p> : null}
      {receiptDetail ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">رقم الإيصال</p>
            <p className="mt-1 font-bold">{receiptDetail.receipt_number}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">رقم الدفع</p>
            <p className="mt-1 font-bold">{formatShortId(receiptDetail.payment_id)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">رقم الفاتورة</p>
            <p className="mt-1 font-bold">{formatShortId(receiptDetail.invoice_id)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">رقم العقد</p>
            <p className="mt-1 font-bold">{formatShortId(receiptDetail.contract_id)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">تاريخ الدفع</p>
            <p className="mt-1 font-bold">{formatDate(receiptDetail.payment_date)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">المبلغ</p>
            <p className="mt-1 font-bold">{formatMoney(receiptDetail.amount)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">طريقة الدفع</p>
            <p className="mt-1 font-bold">{paymentMethodLabels[receiptDetail.payment_method] ?? receiptDetail.payment_method}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">المرجع</p>
            <p className="mt-1 font-bold">{receiptDetail.reference_number || '—'}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
            <p className="mt-1 font-bold">{formatDate(receiptDetail.created_at)}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3 md:col-span-2 xl:col-span-3">
            <p className="text-xs text-muted-foreground">السياق المرتبط</p>
            <p className="mt-1 font-bold">{formatReceiptContext(receiptDetail)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
