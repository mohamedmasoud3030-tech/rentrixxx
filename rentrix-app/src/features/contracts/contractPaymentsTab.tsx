import { FileText, LockKeyhole, ReceiptText, WalletCards } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDefaultCompanyMoney } from '@/lib/companyFormatters';
import { invoiceStatusLabels } from '@/features/financials/components/invoice-status-labels';
import { paymentMethodLabels } from '@/features/financials/components/receipt-formatters';
import type { ContractPaymentsSnapshot } from './services/contractPaymentService';
import { useContractPayments } from './useContractPayments';

const arabicDateFormatter = new Intl.DateTimeFormat('ar', {
  dateStyle: 'medium',
});
const invoiceStatusTone: Record<string, string> = {
  draft: 'gray',
  issued: 'blue',
  UNPAID: 'blue',
  partial: 'gold',
  PARTIALLY_PAID: 'gold',
  paid: 'green',
  PAID: 'green',
  overdue: 'red',
  OVERDUE: 'red',
  void: 'gray',
  VOID: 'gray',
};

function formatDate(value: string): string {
  return arabicDateFormatter.format(new Date(value));
}

function getPaymentsErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'تعذر تحميل مدفوعات وفواتير العقد.';
}

function SnapshotMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function ContractPaymentsSummary({
  snapshot,
}: Readonly<{ snapshot: ContractPaymentsSnapshot }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <SnapshotMetric
        label="عدد الفواتير"
        value={snapshot.summary.invoiceCount.toLocaleString('ar')}
      />
      <SnapshotMetric
        label="عدد الدفعات"
        value={snapshot.summary.paymentCount.toLocaleString('ar')}
      />
      <SnapshotMetric
        label="إجمالي الفواتير"
        value={formatDefaultCompanyMoney(snapshot.summary.totalInvoiced)}
      />
      <SnapshotMetric
        label="إجمالي المدفوع"
        value={formatDefaultCompanyMoney(snapshot.summary.totalPaid)}
      />
      <SnapshotMetric
        label="المتبقي"
        value={formatDefaultCompanyMoney(snapshot.summary.totalRemaining)}
      />
    </div>
  );
}

function ContractInvoicesTable({
  snapshot,
}: Readonly<{ snapshot: ContractPaymentsSnapshot }>) {
  if (snapshot.invoices.length === 0) {
    return (
      <EmptyState
        title="لا توجد فواتير مرتبطة"
        description="لم يتم العثور على فواتير حالية لهذا العقد عبر مسار البيانات المعتمد."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الفاتورة</TableHead>
            <TableHead>الاستحقاق</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>المدفوع</TableHead>
            <TableHead>المتبقي</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot.invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-xs font-bold">
                #{invoice.id.slice(0, 8)}
              </TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell>
                <StatusBadge tone={(invoiceStatusTone[invoice.status ?? ''] ?? 'gray') as 'gray' | 'blue' | 'gold' | 'green' | 'red'}>
                  {invoiceStatusLabels[invoice.status]}
                </StatusBadge>
              </TableCell>
              <TableCell className="font-bold">
                {formatDefaultCompanyMoney(invoice.amount)}
              </TableCell>
              <TableCell className="font-bold text-emerald-700 dark:text-emerald-200">
                {formatDefaultCompanyMoney(invoice.paid_amount)}
              </TableCell>
              <TableCell className="font-bold">
                {formatDefaultCompanyMoney(invoice.remaining_amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ContractPaymentsTable({
  snapshot,
}: Readonly<{ snapshot: ContractPaymentsSnapshot }>) {
  if (snapshot.payments.length === 0) {
    return (
      <EmptyState
        title="لا توجد دفعات مسجلة"
        description="سيظهر هنا سجل الدفعات والإيصالات المرجعية عند توفر دفعات منشورة على فواتير هذا العقد."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>تاريخ الدفع</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>طريقة الدفع</TableHead>
            <TableHead>مرجع الفاتورة</TableHead>
            <TableHead>مرجع الإيصال</TableHead>
            <TableHead>مرجع خارجي</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot.payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.payment_date)}</TableCell>
              <TableCell className="font-bold">
                {formatDefaultCompanyMoney(payment.amount)}
              </TableCell>
              <TableCell>
                {paymentMethodLabels[payment.payment_method]}
              </TableCell>
              <TableCell className="font-mono text-xs font-bold">
                #{payment.invoice_id.slice(0, 8)}
              </TableCell>
              <TableCell className="font-mono text-xs font-bold">
                {payment.receipt_reference}
              </TableCell>
              <TableCell>{payment.reference_number ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ContractPaymentsTab({
  contractId,
}: Readonly<{ contractId: string }>) {
  const paymentsQuery = useContractPayments(contractId);

  const retryPayments = async () => {
    await paymentsQuery.refetch();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/35">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-5 text-primary" />
              تبويب مدفوعات العقد
            </CardTitle>
            <CardDescription>
              عرض قراءة فقط للفواتير والدفعات ومراجع الإيصالات المرتبطة بهذا
              العقد فقط.
            </CardDescription>
          </div>
          <StatusBadge tone="gray">
            <LockKeyhole className="me-1 size-3" />
            قراءة فقط
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <p className="rounded-2xl border border-border bg-background p-4 text-sm leading-7 text-muted-foreground">
          هذا العرض لا ينشئ دفعات، ولا يصدر إيصالات، ولا يعدّل الفواتير. يتم عرض
          السجلات الموجودة فقط من مسارات الفواتير والمدفوعات الحالية.
        </p>

        {paymentsQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-bold text-muted-foreground">
            جاري تحميل مدفوعات العقد…
          </div>
        ) : null}
        {paymentsQuery.isError ? (
          <EmptyState
            title="تعذر تحميل المدفوعات"
            description={getPaymentsErrorMessage(paymentsQuery.error)}
            action={
              <Button type="button" onClick={retryPayments}>
                إعادة المحاولة
              </Button>
            }
          />
        ) : null}
        {paymentsQuery.data ? (
          <div className="space-y-5">
            <ContractPaymentsSummary snapshot={paymentsQuery.data} />
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-black">
                <FileText className="size-5 text-primary" />
                الفواتير المرتبطة
              </h3>
              <ContractInvoicesTable snapshot={paymentsQuery.data} />
            </section>
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-black">
                <ReceiptText className="size-5 text-primary" />
                الدفعات ومراجع الإيصالات
              </h3>
              <ContractPaymentsTable snapshot={paymentsQuery.data} />
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}