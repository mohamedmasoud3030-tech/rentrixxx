import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProperties } from '@/features/properties/use-properties';
import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { useInvoices, useGenerateInvoices, useInvoice } from './invoices/useInvoices';
import { usePostPayment } from './payments/usePayments';
import { useExpenses, useCreateExpense } from './expenses/useExpenses';
import type { InvoiceStatusFilter } from './invoices/invoiceService';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'], { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const invoiceStatusLabels: Record<string, string> = {
  draft: 'مسودة',
  issued: 'غير مدفوعة',
  partial: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  void: 'ملغاة',
};

const invoiceStatusFilterLabels: Record<InvoiceStatusFilter, string> = {
  all: 'الكل',
  unpaid: 'غير مدفوعة',
  partial: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
}

function formatMoney(value: number | null | undefined) {
  return formatCompanyMoney(defaultCompanyLocalSettings, value);
}

function formatDate(value: string | number | Date) {
  return formatCompanyDate(defaultCompanyLocalSettings, value);
}

export function FinancialsPage() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [search, setSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const {
    data: invoices = [],
    isLoading: isInvoicesLoading,
    isError: isInvoicesError,
    error: invoicesError,
  } = useInvoices({ status, search });
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
  const remaining = useMemo(
    () => (invoiceDetail ? Math.max(0, invoiceDetail.amount - invoiceDetail.paid_amount) : 0),
    [invoiceDetail],
  );
  const propertyRows = properties?.rows ?? [];
  const hasInvoiceSearchOrFilter = search.trim().length > 0 || status !== 'all';

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

  return <div className="space-y-6" dir="rtl">
    <Card><CardHeader><CardTitle>الفواتير</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'unpaid', 'partial', 'paid', 'overdue'] as const).map((s) => <Button key={s} variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{invoiceStatusFilterLabels[s]}</Button>)}
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? 'جارٍ توليد الفواتير...' : 'توليد الفواتير من العقود النشطة'}</Button>
      </div>
      <input
        className="w-full rounded border px-3 py-2"
        placeholder="ابحث برقم الفاتورة أو الحالة"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {isInvoicesLoading ? <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل الفواتير...</p> : null}
      {isInvoicesError ? <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">تعذر تحميل الفواتير: {getErrorMessage(invoicesError)}</p> : null}
      {!isInvoicesLoading && !isInvoicesError && invoices.length === 0 ? <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">{hasInvoiceSearchOrFilter ? 'لا توجد فواتير مطابقة للبحث أو الفلتر الحالي.' : 'لا توجد فواتير حتى الآن.'}</p> : null}
      {!isInvoicesLoading && !isInvoicesError ? invoices.map((invoice) => {
        const invoiceRemaining = Math.max(0, invoice.amount - invoice.paid_amount);
        const isSelected = selectedInvoiceId === invoice.id;

        return (
          <button
            key={invoice.id}
            className={`block w-full rounded border p-3 text-right transition ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/60 hover:bg-muted/40'}`}
            onClick={() => setSelectedInvoiceId(invoice.id)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">فاتورة #{invoice.id.slice(0, 8)}</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{invoiceStatusLabels[invoice.status] ?? invoice.status}</span>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
              <span>تاريخ الاستحقاق: {formatDate(invoice.due_date)}</span>
              <span>المبلغ: {formatMoney(invoice.amount)}</span>
              <span>المدفوع: {formatMoney(invoice.paid_amount)}</span>
              <span>المتبقي: {formatMoney(invoiceRemaining)}</span>
            </div>
          </button>
        );
      }) : null}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>تفاصيل الفاتورة وسجل المدفوعات</CardTitle></CardHeader><CardContent className="space-y-3">
      {!selectedInvoiceId ? <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">اختر فاتورة لعرض التفاصيل وسجل المدفوعات.</p> : null}
      {selectedInvoiceId && isInvoiceDetailLoading ? <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">جارٍ تحميل تفاصيل الفاتورة...</p> : null}
      {selectedInvoiceId && isInvoiceDetailError ? <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">تعذر تحميل تفاصيل الفاتورة: {getErrorMessage(invoiceDetailError)}</p> : null}
      {selectedInvoiceId && !isInvoiceDetailLoading && !isInvoiceDetailError && invoiceDetail ? <>
        <p>الإجمالي: {formatMoney(invoiceDetail.amount)} | المدفوع: {formatMoney(invoiceDetail.paid_amount)} | المتبقي: {formatMoney(remaining)}</p>
        {invoiceDetail.payments.length === 0 ? <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">لا توجد مدفوعات مسجلة لهذه الفاتورة.</p> : null}
        {invoiceDetail.payments.map((payment) => <p key={payment.id}>{formatDate(payment.payment_date)} — {formatMoney(payment.amount)} ({payment.payment_method})</p>)}
        <div className="flex gap-2"><input className="rounded border px-2" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} /><Button onClick={() => { const value = Number(amount); if (value <= 0 || value > remaining) return; postPayment.mutate({ invoice_id: invoiceDetail.id, amount: value, method: 'cash', date: new Date().toISOString().slice(0,10), reference: null }); }}>تسجيل دفعة</Button></div>
      </> : null}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>المصاريف</CardTitle></CardHeader><CardContent className="space-y-4">
      {expenses.map((e) => <p key={e.id}>{formatDate(e.expense_date)} — {e.category} — {formatMoney(e.amount)}</p>)}

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
