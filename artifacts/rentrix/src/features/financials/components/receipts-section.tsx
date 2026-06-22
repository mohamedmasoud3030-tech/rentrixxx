import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceiptRecord } from '../receipts/receiptService';
import { formatDate, formatMoney, formatShortId, getErrorMessage } from './financials-formatters';
import { ReceiptDetailCard } from './receipt-detail-card';
import { formatReceiptContext, paymentMethodLabels, receiptStatusLabels } from './receipt-formatters';

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
  onPrintReceipt?: (receiptId: string) => void;
  onExportReceipt?: (receiptId: string) => void;
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
  onPrintReceipt,
  onExportReceipt,
}: ReceiptsSectionProps) {
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
              <div
                key={receipt.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border p-4 transition',
                  isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'bg-background hover:border-primary/60 hover:bg-muted/40',
                )}
              >
                <button
                  className="w-full text-start grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1.3fr_auto]"
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

                {(onPrintReceipt || onExportReceipt) && (
                  <div className="flex gap-2 border-t pt-2">
                    {onPrintReceipt && (
                      <Button
                        variant="secondary"
                        className="h-8"
                        onClick={() => onPrintReceipt(receipt.id)}
                        title="طباعة الإيصال"
                      >
                        <Printer className="size-4 ml-1" />
                        طباعة
                      </Button>
                    )}
                    {onExportReceipt && (
                      <Button
                        variant="secondary"
                        className="h-8"
                        onClick={() => onExportReceipt(receipt.id)}
                        title="تنزيل PDF"
                      >
                        <Download className="size-4 ml-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
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
