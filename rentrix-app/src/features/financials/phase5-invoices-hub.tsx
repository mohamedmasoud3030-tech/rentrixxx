import { FileText, Plus, ReceiptText } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EntityCell } from '@/components/ui/entity-cell';
import { EntityTable, type ColumnDef } from '@/components/ui/entity-table';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { Select } from '@/components/ui/select';
import { EntityCard } from '@/components/ui/entity-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMockContracts, useMockInvoices } from '@/hooks/use-mock-repositories';
import type { Invoice, InvoiceStatus } from '@/domain/types';

export type Phase5InvoiceFormValues = Readonly<{
  contractId: string;
  amount: string;
  dueDate: string;
}>;

export function validatePhase5InvoiceForm(values: Phase5InvoiceFormValues): string | null {
  if (!values.contractId) return 'يجب اختيار العقد.';
  const amount = Number(values.amount);
  if (isNaN(amount) || amount <= 0) return 'قيمة المطالبة يجب أن تكون رقماً موجباً.';
  if (!values.dueDate) return 'تاريخ الاستحقاق مطلوب.';
  return null;
}

const emptyInvoiceForm: Phase5InvoiceFormValues = { contractId: '', amount: '', dueDate: '' };

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

const statusMap: Record<InvoiceStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  paid: { label: 'مدفوعة', tone: 'success' },
  partially_paid: { label: 'مدفوعة جزئياً', tone: 'warning' },
  unpaid: { label: 'غير مدفوعة', tone: 'danger' },
  overdue: { label: 'متأخرة', tone: 'danger' },
  cancelled: { label: 'ملغاة', tone: 'neutral' },
};

export function Phase5InvoicesHubPage() {
  const invoicesQuery = useMockInvoices();
  const contractsQuery = useMockContracts();

  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [formValues, setFormValues] = useState<Phase5InvoiceFormValues>(emptyInvoiceForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const activeContracts = contractsQuery.data.filter((c) => c.status === 'active');
  const allInvoices = invoicesQuery.data;

  const filteredInvoices = allInvoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return inv.id.toLowerCase().includes(term) || inv.contractId.toLowerCase().includes(term);
  });

  const unpaidCount = allInvoices.filter((i) => i.status === 'unpaid' || i.status === 'partially_paid' || i.status === 'overdue').length;
  const totalAmount = allInvoices.reduce((sum, i) => sum + i.amount, 0);

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const error = validatePhase5InvoiceForm(formValues);
    if (error) {
      setFormError(error);
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      await invoicesQuery.execute({
        contractId: formValues.contractId,
        amount: Number(formValues.amount),
        dueDate: formValues.dueDate,
        status: 'unpaid',
      });
      setFormSuccess('تم إنشاء فاتورة المطالبة محلياً بنجاح.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر إنشاء الفاتورة.');
    } finally {
      setFormSaving(false);
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'id',
      header: 'رقم الفاتورة',
      render: (i: Invoice) => <EntityCell icon={ReceiptText} title={i.id} subtitle={i.contractId} />,
    },
    {
      key: 'amount',
      header: 'القيمة',
      render: (i: Invoice) => <span className="font-bold">{formatArabicNumber(i.amount)} ر.س</span>,
    },
    {
      key: 'dueDate',
      header: 'تاريخ الاستحقاق',
      render: (i: Invoice) => <span dir="ltr" className="text-sm">{i.dueDate}</span>,
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (i: Invoice) => {
        const st = statusMap[i.status] ?? { label: i.status, tone: 'neutral' };
        return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <ReceiptText className="size-4" />
            المرحلة 5: فواتير المطالبات المالية
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز الفواتير</h1>
          <p className="text-sm text-muted-foreground">إنشاء وعرض فواتير المطالبات الإيجارية عبر المستودعات المحلية.</p>
        </div>
        {activeView === 'list' ? (
          <Button onClick={() => { setActiveView('create'); setFormValues(emptyInvoiceForm); setFormError(null); setFormSuccess(null); }} className="gap-2">
            <Plus className="size-4" />
            إنشاء فاتورة جديدة
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setActiveView('list')}>العودة للقائمة</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="إجمالي الفواتير" value={formatArabicNumber(allInvoices.length)} sub="إجمالي الفواتير المسجلة محلياً" accent="primary" icon={ReceiptText} />
        <KpiCard label="فواتير مستحقة وغير مدفوعة" value={formatArabicNumber(unpaidCount)} sub="الفواتير بانتظار التحصيل" accent="amber" icon={FileText} />
        <KpiCard label="إجمالي المطالبات" value={`${formatArabicNumber(totalAmount)} ر.س`} sub="القيمة الإجمالية للمطالبات" accent="sky" icon={ReceiptText} />
      </div>

      {activeView === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">إصدار مطالبة مالية جديدة</CardTitle>
            <CardDescription>اربط المطالبة بعقد سارٍ وحدد تاريخ الاستحقاق والقيمة.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-bold">العقد المرتبط</label>
                  <Select value={formValues.contractId} onChange={(e) => setFormValues((c) => ({ ...c, contractId: e.target.value }))}>
                    <option value="">اختر العقد</option>
                    {activeContracts.map((c) => (
                      <option key={c.id} value={c.id}>عقد {c.id} (إيجار: {formatArabicNumber(c.rentAmount)})</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">قيمة المطالبة (ر.س)</label>
                  <Input type="number" step="0.01" min="1" value={formValues.amount} onChange={(e) => setFormValues((c) => ({ ...c, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ الاستحقاق</label>
                  <Input type="date" value={formValues.dueDate} onChange={(e) => setFormValues((c) => ({ ...c, dueDate: e.target.value }))} />
                </div>
              </div>
              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={formSaving}>{formSaving ? 'جار الإنشاء...' : 'حفظ الفاتورة'}</Button>
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
              <CardTitle className="text-xl font-black">سجل الفواتير والمطالبات</CardTitle>
              <CardDescription>عرض الفواتير وحالات السداد</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')} className="w-full sm:w-44">
                <option value="all">جميع الحالات</option>
                <option value="unpaid">غير مدفوعة</option>
                <option value="partially_paid">مدفوعة جزئياً</option>
                <option value="paid">مدفوعة</option>
              </Select>
              <Input placeholder="بحث برقم الفاتورة أو العقد..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-60" />
            </div>
          </CardHeader>
          <CardContent>
            <EntityTable<Invoice>
              aria-label="جدول الفواتير"
              rows={filteredInvoices}
              keyOf={(i) => i.id}
              emptyTitle="لا توجد فواتير مسجلة"
              emptyDescription="قم بإنشاء فاتورة جديدة لعقد سارٍ."
              renderMobileCard={(inv: Invoice) => {
                const st = statusMap[inv.status] ?? { label: inv.status, tone: 'neutral' };
                return (
                  <EntityCard
                    id={inv.id}
                    name={inv.id}
                    subtitle={`العقد: ${inv.contractId} · تاريخ الاستحقاق: ${inv.dueDate}`}
                    type="string"
                    badge={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
                    stats={<span className="font-black text-primary">{formatArabicNumber(inv.amount)} ر.س</span>}
                  />
                );
              }}
              columns={columns}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
