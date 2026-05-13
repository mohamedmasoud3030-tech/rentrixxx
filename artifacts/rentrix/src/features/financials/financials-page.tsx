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
import type { InvoiceStatusFilter } from './invoices/invoiceService';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'], { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional().transform((value) => value || null),
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
  const form = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema), defaultValues: { property_id: '', category: 'صيانة', amount: 0, expense_date: new Date().toISOString().slice(0, 10), description: '' } });

  const remaining = useMemo(() => (invoiceDetail ? invoiceDetail.amount - invoiceDetail.paid_amount : 0), [invoiceDetail]);

  return <div className="space-y-6" dir="rtl">
    <Card><CardHeader><CardTitle>الفواتير</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex gap-2">{(['unpaid', 'partial', 'paid', 'overdue'] as const).map((s) => <Button key={s} variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{s}</Button>)}<Button onClick={() => generate.mutate()} disabled={generate.isPending}>توليد الفواتير من العقود النشطة</Button></div>
      {invoices.map((i) => <button key={i.id} className="block w-full rounded border p-2 text-right" onClick={() => setSelectedInvoiceId(i.id)}>#{i.id.slice(0, 8)} — {i.amount} / {i.status}</button>)}
    </CardContent></Card>

    {invoiceDetail && <Card><CardHeader><CardTitle>تفاصيل الفاتورة وسجل المدفوعات</CardTitle></CardHeader><CardContent className="space-y-3"><p>الإجمالي: {invoiceDetail.amount} | المدفوع: {invoiceDetail.paid_amount} | المتبقي: {remaining}</p>{invoiceDetail.payments.map((p) => <p key={p.id}>{p.payment_date} — {p.amount} ({p.payment_method})</p>)}<div className="flex gap-2"><input className="rounded border px-2" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} /><Button onClick={() => { const value = Number(amount); if (value <= 0 || value > remaining) return; postPayment.mutate({ invoice_id: invoiceDetail.id, amount: value, method: 'cash', date: new Date().toISOString().slice(0,10), reference: null }); }}>تسجيل دفعة</Button></div></CardContent></Card>}

    <Card><CardHeader><CardTitle>المصاريف</CardTitle></CardHeader><CardContent className="space-y-2">{expenses.map((e) => <p key={e.id}>{e.expense_date} — {e.category} — {e.amount}</p>)}
      <form className='grid gap-2' onSubmit={form.handleSubmit((values) => createExpense.mutate(values))}>
        <select className='rounded border px-2 py-2' {...form.register('property_id')}><option value=''>اختر العقار</option>{properties?.rows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <select className='rounded border px-2 py-2' {...form.register('category')}><option value='صيانة'>صيانة</option><option value='مرافق'>مرافق</option><option value='إدارية'>إدارية</option><option value='تأمين'>تأمين</option><option value='أخرى'>أخرى</option></select>
        <input className='rounded border px-2 py-2' type='number' min='0.01' step='0.01' {...form.register('amount')} placeholder='المبلغ' />
        <input className='rounded border px-2 py-2' type='date' {...form.register('expense_date')} />
        <textarea className='rounded border px-2 py-2' {...form.register('description')} placeholder='الوصف' />
        <Button type='submit' disabled={createExpense.isPending}>إضافة مصروف</Button>
      </form>
    </CardContent></Card>
  </div>;
}
