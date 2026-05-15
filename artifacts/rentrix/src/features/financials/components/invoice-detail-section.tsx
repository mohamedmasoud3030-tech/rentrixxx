import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InvoiceDetail } from '../invoices/invoiceService';
import { formatDate, formatMoney, getErrorMessage } from './financials-formatters';
import { QuickPaymentForm } from './quick-payment-form';

type InvoiceDetailSectionProps = {
  selectedInvoiceId: string;
  invoiceDetail: InvoiceDetail | undefined;
  remaining: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  amount: string;
  amountValidationMessage: string;
  isPaymentPending: boolean;
  isPaymentDisabled: boolean;
  onAmountChange: (amount: string) => void;
  onPostPayment: () => void;
};

export function InvoiceDetailSection({
  selectedInvoiceId,
  invoiceDetail,
  remaining,
  isLoading,
  isError,
  error,
  amount,
  amountValidationMessage,
  isPaymentPending,
  isPaymentDisabled,
  onAmountChange,
  onPostPayment,
}: InvoiceDetailSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل الفاتورة وسجل المدفوعات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedInvoiceId ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">اختر فاتورة لعرض التفاصيل وتسجيل دفعة</div> : null}
        {selectedInvoiceId && isLoading ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">جارٍ تحميل تفاصيل الفاتورة...</div> : null}
        {selectedInvoiceId && isError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">{getErrorMessage(error, 'تعذر تحميل تفاصيل الفاتورة')}</div> : null}
        {invoiceDetail ? <>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">رقم الفاتورة</p>
              <p className="mt-2 font-black">#{invoiceDetail.id.slice(0, 8)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p>
              <p className="mt-2 font-black">{formatDate(invoiceDetail.due_date)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">الإجمالي</p>
              <p className="mt-2 font-black">{formatMoney(invoiceDetail.amount)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">المدفوع</p>
              <p className="mt-2 font-black">{formatMoney(invoiceDetail.paid_amount)}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">المتبقي</p>
              <p className="mt-2 font-black">{formatMoney(remaining)}</p>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h4 className="font-black">سجل المدفوعات</h4>
            <div className="mt-3 space-y-2">
              {invoiceDetail.payments.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مدفوعات مسجلة لهذه الفاتورة</p> : null}
              {invoiceDetail.payments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-1 rounded-xl bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{formatDate(payment.payment_date)}</span>
                  <span className="font-bold">{formatMoney(payment.amount)}</span>
                  <span className="text-sm text-muted-foreground">{payment.payment_method}</span>
                </div>
              ))}
            </div>
          </div>

          <QuickPaymentForm
            amount={amount}
            amountValidationMessage={amountValidationMessage}
            isPending={isPaymentPending}
            isPaymentDisabled={isPaymentDisabled}
            onAmountChange={onAmountChange}
            onPostPayment={onPostPayment}
          />
        </> : null}
      </CardContent>
    </Card>
  );
}
