import { DollarSign, Plus, ReceiptText } from 'lucide-react';
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
import { useMockExpenses, useMockProperties, useMockUnits } from '@/hooks/use-mock-repositories';
import { expenseRepo } from '@/services/mock-repos';
import type { Expense, ExpenseResponsibility } from '@/domain/types';

export type Phase5ExpenseFormValues = Readonly<{
  propertyId: string;
  unitId: string;
  amount: string;
  expenseDate: string;
  description: string;
  responsibility: ExpenseResponsibility;
}>;

export function validatePhase5ExpenseForm(values: Phase5ExpenseFormValues): string | null {
  if (!values.propertyId) return 'يجب تحديد العقار.';
  const amount = Number(values.amount);
  if (isNaN(amount) || amount <= 0) return 'قيمة المصروف يجب أن تكون رقماً موجباً.';
  if (!values.expenseDate) return 'تاريخ المصروف مطلوب.';
  if (!values.description.trim()) return 'وصف المصروف مطلوب.';
  return null;
}

const emptyExpenseForm: Phase5ExpenseFormValues = {
  propertyId: '',
  unitId: '',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0] ?? '',
  description: '',
  responsibility: 'owner',
};

function formatArabicNumber(value: number): string {
  return value.toLocaleString('ar');
}

const respMap: Record<ExpenseResponsibility, { label: string; tone: 'warning' | 'primary' | 'info' }> = {
  owner: { label: 'على المالك', tone: 'warning' },
  office: { label: 'على المكتب', tone: 'primary' },
  shared: { label: 'مشترك', tone: 'info' },
};

export function Phase5ExpensesHubPage() {
  const expensesQuery = useMockExpenses();
  const propertiesQuery = useMockProperties();
  const unitsQuery = useMockUnits();

  const [activeView, setActiveView] = useState<'list' | 'create'>('list');
  const [formValues, setFormValues] = useState<Phase5ExpenseFormValues>(emptyExpenseForm);
  const [search, setSearch] = useState('');
  const [respFilter, setRespFilter] = useState<ExpenseResponsibility | 'all'>('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const activeProperties = propertiesQuery.data;
  const propertyUnits = unitsQuery.data.filter((u) => u.propertyId === formValues.propertyId);

  const allExpenses = expensesQuery.data;
  const filteredExpenses = allExpenses.filter((exp) => {
    if (respFilter !== 'all' && exp.responsibility !== respFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return exp.description.toLowerCase().includes(term) || exp.propertyId.toLowerCase().includes(term);
  });

  const totalAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const error = validatePhase5ExpenseForm(formValues);
    if (error) {
      setFormError(error);
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      await expensesQuery.execute({
        propertyId: formValues.propertyId,
        unitId: formValues.unitId || undefined,
        amount: Number(formValues.amount),
        expenseDate: formValues.expenseDate,
        description: formValues.description.trim(),
        responsibility: formValues.responsibility,
      });
      setFormSuccess('تم تسجيل المصروف التشغيلي بنجاح.');
      setTimeout(() => setActiveView('list'), 1200);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذر حفظ المصروف.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await expenseRepo.archive(id);
    } catch (err) {
      console.error(err);
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'desc',
      header: 'المصروف',
      render: (e: Expense) => {
        const prop = propertiesQuery.data.find((p) => p.id === e.propertyId);
        const unit = unitsQuery.data.find((u) => u.id === e.unitId);
        return <EntityCell icon={ReceiptText} title={e.description} subtitle={`${prop?.name ?? e.propertyId}${unit ? ` · ${unit.name}` : ''}`} />;
      },
    },
    {
      key: 'amount',
      header: 'القيمة',
      render: (e: Expense) => <span className="font-bold text-rose-700 dark:text-rose-300">{formatArabicNumber(e.amount)} ر.س</span>,
    },
    {
      key: 'dateResp',
      header: 'التاريخ والمسؤولية',
      render: (e: Expense) => {
        const st = respMap[e.responsibility] ?? { label: e.responsibility, tone: 'neutral' };
        return (
          <div className="text-sm">
            <span dir="ltr">{e.expenseDate}</span> · <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (e: Expense) => (
        <Button variant="danger" onClick={() => handleArchive(e.id)} className="min-h-9 px-3 text-xs">
          أرشفة
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
            المرحلة 5: تسجيل المصروفات التشغيلية
          </div>
          <h1 className="mt-2 text-3xl font-black">مركز المصروفات</h1>
          <p className="text-sm text-muted-foreground">إدارة المصروفات التشغيلية وتحديد المسؤوليات المالية بين الملاك والمكتب.</p>
        </div>
        {activeView === 'list' ? (
          <Button onClick={() => { setActiveView('create'); setFormValues(emptyExpenseForm); setFormError(null); setFormSuccess(null); }} className="gap-2">
            <Plus className="size-4" />
            تسجيل مصروف جديد
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setActiveView('list')}>العودة للسجل</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard label="إجمالي المصروفات النشطة" value={formatArabicNumber(allExpenses.length)} sub="عدد سجلات المصروفات" accent="primary" icon={ReceiptText} />
        <KpiCard label="إجمالي التكاليف" value={`${formatArabicNumber(totalAmount)} ر.س`} sub="مجموع المصروفات غير المؤرشفة" accent="rose" icon={DollarSign} />
      </div>

      {activeView === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">تسجيل مصروف تشغيلي جديد</CardTitle>
            <CardDescription>اختر العقار، وتاريخ المصروف، والمبلغ والمسؤولية المالية.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">العقار</label>
                  <Select value={formValues.propertyId} onChange={(e) => setFormValues((c) => ({ ...c, propertyId: e.target.value, unitId: '' }))}>
                    <option value="">اختر العقار</option>
                    {activeProperties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">الوحدة (اختياري)</label>
                  <Select value={formValues.unitId} onChange={(e) => setFormValues((c) => ({ ...c, unitId: e.target.value }))} disabled={!formValues.propertyId}>
                    <option value="">مصروف عام على كامل العقار</option>
                    {propertyUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">قيمة المصروف (ر.س)</label>
                  <Input type="number" step="0.01" min="1" value={formValues.amount} onChange={(e) => setFormValues((c) => ({ ...c, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">تاريخ المصروف</label>
                  <Input type="date" value={formValues.expenseDate} onChange={(e) => setFormValues((c) => ({ ...c, expenseDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">المسؤولية المالية</label>
                  <Select value={formValues.responsibility} onChange={(e) => setFormValues((c) => ({ ...c, responsibility: e.target.value as ExpenseResponsibility }))}>
                    <option value="owner">خصم على المالك</option>
                    <option value="office">خصم على المكتب</option>
                    <option value="shared">مشترك بينهما</option>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold">وصف المصروف</label>
                  <Input placeholder="مثال: صيانة مصعد العقار الرئيسي" value={formValues.description} onChange={(e) => setFormValues((c) => ({ ...c, description: e.target.value }))} />
                </div>
              </div>
              {formError && <p className="text-sm font-bold text-rose-600">{formError}</p>}
              {formSuccess && <p className="text-sm font-bold text-emerald-600">{formSuccess}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={formSaving}>{formSaving ? 'جار الحفظ...' : 'حفظ المصروف'}</Button>
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
              <CardTitle className="text-xl font-black">سجل المصروفات التشغيلية</CardTitle>
              <CardDescription>عرض المصروفات وتحديد التكلفة</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={respFilter} onChange={(e) => setRespFilter(e.target.value as ExpenseResponsibility | 'all')} className="w-full sm:w-44">
                <option value="all">جميع المسؤوليات</option>
                <option value="owner">على المالك</option>
                <option value="office">على المكتب</option>
                <option value="shared">مشترك</option>
              </Select>
              <Input placeholder="بحث بالوصف أو العقار..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-60" />
            </div>
          </CardHeader>
          <CardContent>
            <EntityTable<Expense>
              aria-label="جدول المصروفات"
              rows={filteredExpenses}
              keyOf={(e) => e.id}
              emptyTitle="لا توجد مصروفات مسجلة"
              emptyDescription="قم بتسجيل مصروف تشغيلي جديد."
              renderMobileCard={(exp: Expense) => {
                const st = respMap[exp.responsibility] ?? { label: exp.responsibility, tone: 'neutral' };
                return (
                  <EntityCard
                    id={exp.id}
                    name={exp.description}
                    subtitle={`العقار: ${exp.propertyId} · ${exp.expenseDate}`}
                    type="string"
                    badge={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
                    stats={<span className="font-black text-rose-700 dark:text-rose-300">{formatArabicNumber(exp.amount)} ر.س</span>}
                    actions={[{ label: 'أرشفة', variant: 'danger', onClick: () => handleArchive(exp.id) }]}
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
