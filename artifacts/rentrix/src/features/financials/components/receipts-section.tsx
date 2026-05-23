import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReceiptRecord } from '../receipts/receiptService';
import { formatDate, formatMoney, formatShortId, getErrorMessage } from '@lib/format';
import { ReceiptDetailCard } from './receipt-detail-card';
import { formatReceiptContext, paymentMethodLabels, receiptStatusLabels } from '@lib/format';

type ReceiptsSectionProps = {
  receipts: ReceiptRecord[];
  selectedReceiptId: string;
  receiptDetail: ReceiptRecord | undefined;
  isReceiptsLoading: boolean;
  isReceiptsError: boolean;
  receiptsError: unknown;
  isReceiptDetailLoading: boolean;
  isReceiptDetailError: boolean;
  receiptDetailError: unknown;
  onSelectReceipt: (receiptId: string) => void;
};

export function ReceiptsSection({
  receipts,
  selectedReceiptId,
  receiptDetail,
  isReceiptsLoading,
  isReceiptsError,
  receiptsError,
  isReceiptDetailLoading,
  isReceiptDetailError,
  receiptDetailError,
  onSelectReceipt,
}: Readonly<ReceiptsSectionProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الإيصالات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {isReceiptsLoading ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">جارٍ تحميل الإيصالات...</div> : null}
          {isReceiptsError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">{getErrorMessage(receiptsError, 'تعذر تحميل الإيصالات')}</div> : null}
          {!isReceiptsLoading && !isReceiptsError && receipts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">لا توجد إيصالات من مدفوعات مرحلة حتى الآن</div>
          ) : null}
          {!isReceiptsLoading && !isReceiptsError && receipts.map((receipt) => {
            const isSelected = selectedReceiptId === receipt.id;
            return (
              <button
                key={receipt.id}
                className={cn(
                  'grid w-full gap-3 rounded-2xl border p-4 text-start transition hover:border-primary/60 hover:bg-muted/40 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1.3fr_auto]',
                  isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'bg-background',
                )}
                onClick={() => onSelectReceipt(receipt.id)}
              >
                <span>
                  <span className="block text-xs text-muted-foreground">رقم الإيصال</span>
                  <span className="font-black">{receipt.receipt_number}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">تاريخ الدفع</span>
                  <span>{formatDate(receipt.payment_date)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">المبلغ</span>
                  <span>{formatMoney(receipt.amount)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">طريقة الدفع</span>
                  <span>{paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">الفاتورة</span>
                  <span>{formatShortId(receipt.invoice_id)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">السياق</span>
                  <span>{formatReceiptContext(receipt)}</span>
                </span>
                <span className="inline-flex h-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {receiptStatusLabels[receipt.status] ?? receipt.status}
                </span>
              </button>
            );
          })}
        </div>

        <ReceiptDetailCard
          selectedReceiptId={selectedReceiptId}
          receiptDetail={receiptDetail}
          isLoading={isReceiptDetailLoading}
          isError={isReceiptDetailError}
          error={receiptDetailError}
        />
      </CardContent>
    </Card>
  );
}
