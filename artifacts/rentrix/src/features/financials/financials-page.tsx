import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProperties } from '@/features/properties/use-properties';
import { useInvoices, useGenerateInvoices, useInvoice } from './invoices/useInvoices';
import { usePostPayment } from './payments/usePayments';
import { useExpenses, useCreateExpense } from './expenses/useExpenses';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';
import type { InvoiceStatusFilter } from './invoices/invoiceService';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'], { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function FinancialsPage() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const { data: invoices = [] } = useInvoices(status);
  const { data: invoiceDetail } = useInvoice(selectedInvoiceId);
  const generate = useGenerateInvoices();
  const postPayment = usePostPayment();
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const [filters] = useState({ propertyId: '', category: '', from: '', to: '' });
  const { data: expenses = [] } = useExpenses(filters);
  const createExpense = useCreateExpense();
  const remaining = useMemo(() => (invoiceDetail ? invoiceDetail.amount - invoiceDetail.paid_amount : 0), [invoiceDetail]);
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

  return <div className="space-y-6" dir="rtl">
    <Card><CardHeader><CardTitle>الفواتير</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex gap-2">{(['unpaid', 'partial', 'paid', 'overdue'] as const).map((s) => <Button key={s} variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{s}</Button>)}<Button onClick={() => generate.mutate()} disabled={generate.isPending}>توليد الفواتير من العقود النشطة</Button></div>
      {invoices.map((i) => <button key={i.id} className="block w-full rounded border p-2 text-right" onClick={() => setSelectedInvoiceId(i.id)}>#{i.id.slice(0, 8)} — {i.amount} / {i.status}</button>)}
    </CardContent></Card>

    {invoiceDetail && <Card><CardHeader><CardTitle>تفاصيل الفاتورة وسجل المدفوعات</CardTitle></CardHeader><CardContent className="space-y-3"><p>الإجمالي: {invoiceDetail.amount} | المدفوع: {invoiceDetail.paid_amount} | المتبقي: {remaining}</p>{invoiceDetail.payments.map((p) => <p key={p.id}>{p.payment_date} — {p.amount} ({p.payment_method})</p>)}<div className="flex gap-2"><input className="rounded border px-2" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} /><Button onClick={() => { const value = Number(amount); if (value <= 0 || value > remaining) return; postPayment.mutate({ invoice_id: invoiceDetail.id, amount: value, method: 'cash', date: new Date().toISOString().slice(0,10), reference: null }); }}>تسجيل دفعة</Button></div></CardContent></Card>}

    <Card><CardHeader><CardTitle>المصاريف</CardTitle></CardHeader><CardContent className="space-y-4">
      {expenses.map((e) => <p key={e.id}>{formatCompanyDate(defaultCompanyLocalSettings, e.expense_date)} — {e.category} — {formatCompanyMoney(defaultCompanyLocalSettings, e.amount)}</p>)}

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
