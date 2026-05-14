import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProperties } from '@/features/properties/use-properties';
import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { cn } from '@/lib/utils';
import { useExpenses, useCreateExpense } from './expenses/useExpenses';
import { summarizeInvoices, type InvoiceStatusFilter } from './invoices/invoiceService';
import { useGenerateInvoices, useInvoice, useInvoices } from './invoices/useInvoices';
import { usePostPayment } from './payments/usePayments';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'], { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const invoiceStatusFilters: { value: InvoiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'unpaid', label: 'غير مدفوعة' },
  { value: 'partial', label: 'مدفوعة جزئياً' },
  { value: 'overdue', label: 'متأخرة' },
  { value: 'paid', label: 'مدفوعة' },
];

const invoiceStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  issued: 'غير مدفوعة',
  unpaid: 'غير مدفوعة',
  partial: 'مدفوعة جزئياً',
  overdue: 'متأخرة',
  paid: 'مدفوعة',
  void: 'ملغاة',
};

function formatMoney(value: number | null | undefined) {
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

function formatDate(value: string | number | Date) {
  return formatCompanyDate(defaultCompanyLocalSettings, value);
}

function getRemainingAmount(amount: number | null | undefined, paidAmount: number | null | undefined) {
  return Math.max(0, Number(amount ?? 0) - Number(paidAmount ?? 0));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function FinancialsPage() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const {
    data: invoices = [],
    isLoading: isInvoicesLoading,
    isError: isInvoicesError,
    error: invoicesError,
  } = useInvoices({ status, search: invoiceSearch });
  const {
    data: invoiceDetail,
    isLoading: isInvoiceDetailLoading,
    isError: isInvoiceDetailError,
    error: invoiceDetailError,
  } = useInvoice(selectedInvoiceId);
  const generate = useGenerateInvoices();
  const postPayment = usePostPayment();
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const [filters] = useState({ propertyId: '', category: '', from: '', to: '' });
  const { data: expenses = [] } = useExpenses(filters);
  const createExpense = useCreateExpense();
  const summary = useMemo(() => summarizeInvoices(invoices), [invoices]);
  const remaining = useMemo(
    () => (invoiceDetail ? getRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount) : 0),
    [invoiceDetail],
  );
  const amountValue = Number(amount);
  const amountValidationMessage = useMemo(() => {
    if (!amount.trim()) return 'المبلغ مطلوب';
    if (!Number.isFinite(amountValue)) return 'المبلغ يجب أن يكون رقماً صالحاً';
    if (amountValue <= 0) return 'المبلغ يجب أن يكون أكبر من صفر';
    if (amountValue > remaining) return 'المبلغ يجب ألا يتجاوز الرصيد المتبقي';
    return '';
  }, [amount, amountValue, remaining]);
  const isPaymentDisabled = postPayment.isPending || remaining <= 0 || Boolean(amountValidationMessage);
  const hasInvoiceFilter = status !== 'all' || invoiceSearch.trim().length > 0;
  const propertyRows = properties?.rows ?? [];

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      property_id: '',
      category: 'صيانة',
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      description: '',
    },
  });

  const onCreateExpense = (values: ExpenseFormValues) => {
    createExpense.mutate(
      {
        property_id: values.property_id,
        category: values.category,
        amount: values.amount,
        expense_date: values.expense_date,
        description: values.description?.trim() ? values.description.trim() : null,
      },
      {
        onSuccess: () => {
          expenseForm.reset({
            property_id: '',
            category: 'صيانة',
            amount: 0,
            expense_date: new Date().toISOString().slice(0, 10),
            description: '',
          });
        },
      },
    );
  };

  const onPostPayment = () => {
    if (!invoiceDetail || isPaymentDisabled) return;
    postPayment.mutate(
      {
        invoice_id: invoiceDetail.id,
        amount: amountValue,
        method: 'cash',
        date: new Date().toISOString().slice(0, 10),
        reference: null,
      },
      {
        onSuccess: () => setAmount(''),
      },
    );
  };

  return <div className="space-y-6" dir="rtl">
    <Card>
      <CardHeader>
        <CardTitle>الفواتير</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">عدد الفواتير</p>
            <p className="mt-2 text-2xl font-black">{summary.count}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
            <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalAmount)}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
            <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">إجمالي المتبقي</p>
            <p className="mt-2 text-2xl font-black">{formatMoney(summary.totalRemaining)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {invoiceStatusFilters.map((filter) => (
              <Button key={filter.value} variant={status === filter.value ? 'primary' : 'secondary'} onClick={() => setStatus(filter.value)}>
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="min-h-10 rounded-xl border bg-background px-3 text-sm"
              placeholder="ابحث برقم الفاتورة أو الحالة"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
            />
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? 'جارٍ التوليد...' : 'توليد الفواتير من العقود النشطة'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {isInvoicesLoading ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">جارٍ تحميل الفواتير...</div> : null}
          {isInvoicesError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">{getErrorMessage(invoicesError, 'تعذر تحميل الفواتير')}</div> : null}
          {!isInvoicesLoading && !isInvoicesError && invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
              {hasInvoiceFilter ? 'لا توجد فواتير مطابقة للبحث أو الفلتر الحالي' : 'لا توجد فواتير حتى الآن'}
            </div>
          ) : null}
          {!isInvoicesLoading && !isInvoicesError && invoices.map((invoice) => {
            const rowRemaining = getRemainingAmount(invoice.amount, invoice.paid_amount);
            const isSelected = selectedInvoiceId === invoice.id;
            return (
              <button
                key={invoice.id}
                className={cn(
                  'grid w-full gap-3 rounded-2xl border p-4 text-right transition hover:border-primary/60 hover:bg-muted/40 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]',
                  isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'bg-background',
                )}
                onClick={() => setSelectedInvoiceId(invoice.id)}
              >
                <span>
                  <span className="block text-xs text-muted-foreground">رقم الفاتورة</span>
                  <span className="font-black">#{invoice.id.slice(0, 8)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">تاريخ الاستحقاق</span>
                  <span>{formatDate(invoice.due_date)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">الإجمالي</span>
                  <span>{formatMoney(invoice.amount)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">المدفوع</span>
                  <span>{formatMoney(invoice.paid_amount)}</span>
                </span>
                <span>
                  <span className="block text-xs text-muted-foreground">المتبقي</span>
                  <span>{formatMoney(rowRemaining)}</span>
                </span>
                <span className="inline-flex h-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {invoiceStatusLabels[invoice.status] ?? invoice.status}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>تفاصيل الفاتورة وسجل المدفوعات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedInvoiceId ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">اختر فاتورة لعرض التفاصيل وتسجيل دفعة</div> : null}
        {selectedInvoiceId && isInvoiceDetailLoading ? <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">جارٍ تحميل تفاصيل الفاتورة...</div> : null}
        {selectedInvoiceId && isInvoiceDetailError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">{getErrorMessage(invoiceDetailError, 'تعذر تحميل تفاصيل الفاتورة')}</div> : null}
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

          <div className="rounded-2xl border p-4">
            <h4 className="font-black">تسجيل دفعة سريعة</h4>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <input
                  className="min-h-10 w-full rounded-xl border bg-background px-3 text-sm"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="المبلغ"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                {amountValidationMessage ? <p className="mt-2 text-sm text-destructive">{amountValidationMessage}</p> : null}
              </div>
              <Button onClick={onPostPayment} disabled={isPaymentDisabled}>
                {postPayment.isPending ? 'جارٍ التسجيل...' : 'تسجيل دفعة'}
              </Button>
            </div>
          </div>
        </> : null}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>المصاريف</CardTitle></CardHeader><CardContent className="space-y-4">
      {expenses.map((expense) => (
        <p key={expense.id}>{formatDate(expense.expense_date)} — {expense.category} — {formatMoney(expense.amount)}</p>
      ))}

      <form className="grid gap-3 rounded border p-4" onSubmit={expenseForm.handleSubmit(onCreateExpense)}>
        <select className="rounded border px-2 py-2" {...expenseForm.register('property_id')}>
          <option value="">اختر العقار</option>
          {propertyRows.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
        </select>
        {expenseForm.formState.errors.property_id ? <p className="text-sm text-red-600">{expenseForm.formState.errors.property_id.message}</p> : null}

        <select className="rounded border px-2 py-2" {...expenseForm.register('category')}>
          <option value="صيانة">صيانة</option>
          <option value="مرافق">مرافق</option>
          <option value="إدارية">إدارية</option>
          <option value="تأمين">تأمين</option>
          <option value="أخرى">أخرى</option>
        </select>
        {expenseForm.formState.errors.category ? <p className="text-sm text-red-600">{expenseForm.formState.errors.category.message}</p> : null}

        <input className="rounded border px-2 py-2" type="number" min="0.01" step="0.01" placeholder="المبلغ" {...expenseForm.register('amount')} />
        {expenseForm.formState.errors.amount ? <p className="text-sm text-red-600">{expenseForm.formState.errors.amount.message}</p> : null}

        <input className="rounded border px-2 py-2" type="date" {...expenseForm.register('expense_date')} />
        {expenseForm.formState.errors.expense_date ? <p className="text-sm text-red-600">{expenseForm.formState.errors.expense_date.message}</p> : null}

        <textarea className="rounded border px-2 py-2" placeholder="الوصف (اختياري)" {...expenseForm.register('description')} />

        <Button type="submit" disabled={createExpense.isPending}>{createExpense.isPending ? 'جارٍ الحفظ...' : 'إضافة مصروف'}</Button>
      </form>
    </CardContent></Card>
  </div>;
}
