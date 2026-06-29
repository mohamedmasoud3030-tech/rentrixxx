import { CheckCircle2, DollarSign, Printer, Receipt } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { EntityCard } from '@/components/ui/entity-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockInvoices, useMockReceipts } from '@/hooks/use-mock-repositories';
import type { PaymentMethod, PaymentReceipt } from '@/domain/types';

export type Phase5PaymentFormValues = Readonly<{
  invoiceId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
}>;

export function validatePhase5PaymentForm(values: Phase5PaymentFormValues, maxAmount?: number): string | null {
  if (!values.invoiceId) return 'يجب اختيار الفاتورة.';
  const amount = Number(values.amount);
  if (isNaN(amount) || amount <= 0) return 'قيمة الدفعة يجب أن تكون رقماً موجباً.';
  if (maxAmount !== undefined && amount > maxAmount) return 'قيمة الدفعة تتجاوز المبلغ المتبقي على الفاتورة.';
  if (!values.paymentDate) return 'تاريخ التحصيل مطلوب.';
  return null;
}

const emptyPaymentForm: Phase5PaymentFormValues = {
  invoiceId: '',
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0] ?? '',
  paymentMethod: 'bank_transfer',
  referenceNumber: '',
};

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

const methodLabels: Record<PaymentMethod, string> = {
  bank_transfer: 'حوالة بنكية',
  cash: 'نقدي',
  check: 'شيك',
};

export function Phase5ReceiptsHubPage() {
  const receiptsQuery = useMockReceipts();
  const invoicesQuery = useMockInvoices();

  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [formValues, setFormValues] = useState<Phase5PaymentFormValues>(emptyPaymentForm);
  const [printReceipt, setPrintReceipt] = useState<PaymentReceipt | null>(null);
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const allReceipts = receiptsQuery.data;
  const allInvoices = invoicesQuery.data;

  const getPaidAmount = (invId: string) =>
    allReceipts.filter((r) => r.invoiceId === invId).reduce((sum, r) => sum + r.amount, 0);

  const collectibleInvoices = allInvoices.filter((inv) => {
    if (inv.status === 'cancelled') return false;
    const paid = getPaidAmount(inv.id);
    return inv.amount > paid;
  });

  const selectedInvoice = collectibleInvoices.find((i) => i.id === formValues.invoiceId);
  const selectedRemaining = selectedInvoice ? selectedInvoice.amount - getPaidAmount(selectedInvoice.id) : undefined;

  const filteredReceipts = allReceipts.filter((r) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return r.id.toLowerCase().includes(term) || r.invoiceId.toLowerCase().includes(term) || (r.referenceNumber ?? '').toLowerCase().includes(term);
  });

  const totalCollected = allReceipts.reduce((sum, r) => sum + r.amount, 0);

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const error = validatePhase5PaymentForm(formValues, selectedRemaining);
    if (error) {
      setFormError(error);
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      await receiptsQuery.execute({
        invoiceId: formValues.invoiceId,
        amount: Number(formValues.amount),
        paymentDate: formValues.paymentDate,
        paymentMethod: formValues.paymentMethod,
        referenceNumber: formValues.referenceNumber.trim() || undefined,
      });
      setFormSuccess('تم تسجيل التحصيل وإصدار سند القبض بنجاح وتحديث الفاتورة.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر تسجيل الدفعة.');
    } finally {
      setFormSaving(false);
    }
  };

  const columns: ColumnDef<PaymentReceipt>[] = [
    {
      key: 'id',
      header: 'رقم السند',
      render: (r: PaymentReceipt) => <EntityCell icon={Receipt} title={r.id} subtitle={`الفاتورة: ${r.invoiceId}`} />,
    },
    {
      key: 'amount',
      header: 'المبلغ المحصل',
      render: (r: PaymentReceipt) => <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatArabicNumber(r.amount)} ر.س</span>,
    },
    {
      key: 'dateMethod',
      header: 'تاريخ وسيلة الدفع',
      render: (r: PaymentReceipt) => (
        <div className="text-sm">
          <span dir="ltr">{r.paymentDate}</span> · <span className="font-bold">{methodLabels[r.paymentMethod]}</span>
          {r.referenceNumber ? <span className="block text-xs text-muted-foreground">مرجع: {r.referenceNumber}</span> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الطباعة',
      render: (r: PaymentReceipt) => (
        <Button variant="secondary" onClick={() => setPrintReceipt(r)} className="min-h-9 px-3 text-xs">
          <Printer className="me-1.5 size-3.5" />
          سند القبض
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <DollarSign className="size-4" />
            المرحلة 5: تسجيل التحصيلات المالية وسندات القبض
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز التحصيلات وسندات القبض</h1>
          <p className="text-sm text-muted-foreground">تسجيل دفعات الفواتير وتوليد سندات قبض مهيأة للطباعة المباشرة والمشاركة.</p>
        </div>
        {activeView === 'list' ? (
          <Button onClick={() => { setActiveView('create'); setFormValues(emptyPaymentForm); setFormError(null); setFormSuccess(null); }} className="gap-2">
            <Receipt className="size-4" />
            تسجيل دفعة وتحصيل جديد
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setActiveView('list')}>العودة للسجل</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard label="إجمالي السندات المصدرة" value={formatArabicNumber(allReceipts.length)} sub="إجمالي سندات القبض غير القابلة للتعديل" accent="primary" icon={Receipt} />
        <KpiCard label="إجمالي المبالغ المحصلة" value={`${formatArabicNumber(totalCollected)} ر.س`} sub="مجموع السيولة المقبوضة" accent="emerald" icon={CheckCircle2} />
      </div>

      {activeView === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">تسجيل سداد وإصدار سند قبض</CardTitle>
            <CardDescription>اختر الفاتورة المستحقة وحدد المبلغ وتاريخ السداد. لا يُسمح بتعديل السندات بعد اعتمادها.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">الفاتورة المستحقة</label>
                  <Select
                    value={formValues.invoiceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const inv = collectibleInvoices.find((item) => item.id === id);
                      const rem = inv ? inv.amount - getPaidAmount(inv.id) : '';
                      setFormValues((c) => ({ ...c, invoiceId: id, amount: rem ? String(rem) : '' }));
                    }}
                  >
                    <option value="">اختر الفاتورة</option>
                    {collectibleInvoices.map((inv) => {
                      const rem = inv.amount - getPaidAmount(inv.id);
                      return (
                        <option key={inv.id} value={inv.id}>
                          فاتورة {inv.id} (إجمالي: {formatArabicNumber(inv.amount)} ر.س | المتبقي: {formatArabicNumber(rem)} ر.س)
                        </option>
                      );
                    })}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">المبلغ المحصل (ر.س) {selectedRemaining !== undefined ? `[الحد الأقصى: ${formatArabicNumber(selectedRemaining)}]` : ''}</label>
                  <Input type="number" step="0.01" min="1" max={selectedRemaining} value={formValues.amount} onChange={(e) => setFormValues((c) => ({ ...c, amount: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ التحصيل الفعلي</label>
                  <Input type="date" value={formValues.paymentDate} onChange={(e) => setFormValues((c) => ({ ...c, paymentDate: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">وسيلة الدفع</label>
                  <Select value={formValues.paymentMethod} onChange={(e) => setFormValues((c) => ({ ...c, paymentMethod: e.target.value as PaymentMethod }))}>
                    <option value="bank_transfer">حوالة بنكية</option>
                    <option value="cash">نقدي</option>
                    <option value="check">شيك</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">رقم المرجع / الحوالة (اختياري)</label>
                  <Input placeholder="مثال: REF-9823423" value={formValues.referenceNumber} onChange={(e) => setFormValues((c) => ({ ...c, referenceNumber: e.target.value }))} dir="ltr" />
                </div>
              </div>

              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={formSaving}>{formSaving ? 'جار حفظ السند...' : 'اعتماد السداد وإصدار السند'}</Button>
                <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeView === 'list' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-black">سجل التحصيلات وسندات القبض</CardTitle>
              <CardDescription>جميع السندات المالية غير القابلة للتعديل</CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Input placeholder="بحث برقم السند أو الفاتورة أو المرجع..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <EntityTable<PaymentReceipt>
              aria-label="جدول سندات القبض"
              rows={filteredReceipts}
              keyOf={(r) => r.id}
              emptyTitle="لا توجد سندات تحصيل"
              emptyDescription="قم بتسجيل سداد فاتورة جديدة."
              renderMobileCard={(rec: PaymentReceipt) => (
                <EntityCard
                  id={rec.id}
                  name={rec.id}
                  subtitle={`الفاتورة: ${rec.invoiceId} · ${rec.paymentDate}`}
                  type="string"
                  badge={<StatusBadge tone="success">{methodLabels[rec.paymentMethod]}</StatusBadge>}
                  supportingText={rec.referenceNumber ? `مرجع: ${rec.referenceNumber}` : undefined}
                  stats={<span className="font-black text-emerald-700 dark:text-emerald-300">{formatArabicNumber(rec.amount)} ر.س</span>}
                  actions={[{ label: 'طباعة السند', icon: Printer, onClick: () => setPrintReceipt(rec) }]}
                />
              )}
              columns={columns}
            />
          </CardContent>
        </Card>
      )}

      {/* Mobile-First RTL Receipt Print View Modal */}
      <Dialog open={Boolean(printReceipt)} onOpenChange={(open) => { if (!open) setPrintReceipt(null); }}>
        <DialogContent className="max-w-md print:max-w-none print:border-none print:shadow-none print:p-0" dir="rtl">
          {printReceipt && (
            <div className="space-y-6 rounded-2xl bg-white p-6 text-slate-900 print:p-8">
              <div className="border-b border-slate-200 pb-4 text-center">
                <p className="text-xs font-black tracking-widest text-slate-500 uppercase">سند قبض مالي رسمى</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">سند تحصيل إيجارى</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">رقم السند: <span dir="ltr" className="font-mono">{printReceipt.id}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-500">تاريخ السند</p>
                  <p className="mt-0.5 font-bold" dir="ltr">{printReceipt.paymentDate}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">وسيلة الدفع</p>
                  <p className="mt-0.5 font-bold">{methodLabels[printReceipt.paymentMethod]}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500">الفاتورة المرتبطة</p>
                  <p className="mt-0.5 font-mono font-bold">{printReceipt.invoiceId}</p>
                </div>
                {printReceipt.referenceNumber && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-500">رقم المرجع / العملية</p>
                    <p className="mt-0.5 font-mono font-bold" dir="ltr">{printReceipt.referenceNumber}</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/50 p-6 text-center">
                <p className="text-xs font-bold text-emerald-800">المبلغ المستلم</p>
                <p className="mt-2 text-4xl font-black text-emerald-700 tabular-nums">{formatArabicNumber(printReceipt.amount)} <span className="text-lg">ر.س</span></p>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 text-center text-xs font-bold text-slate-500 print:pt-12">
                <div>
                  <p className="mb-8">توقيع المستلم (المكتب)</p>
                  <div className="border-b border-dashed border-slate-400 mx-6" />
                </div>
                <div>
                  <p className="mb-8">ختم وتوقيع المالك / المستأجر</p>
                  <div className="border-b border-dashed border-slate-400 mx-6" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 print:hidden">
                <Button variant="secondary" onClick={() => setPrintReceipt(null)}>إغلاق</Button>
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="size-4" />
                  طباعة السند
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
