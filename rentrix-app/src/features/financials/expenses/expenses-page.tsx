import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Banknote, CalendarDays, ReceiptText, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProperties } from '@/features/properties/use-properties';
import { defaultCompanyLocalSettings } from '@/lib/companySettings';
import { formatCompanyMoney, getCompanyLocale } from '@/lib/companyFormatters';
import { ExpensesSection, type ExpenseFormValues } from '../components/expenses-section';
import { getTodayLocalDateString } from '../financials-date-utils';
import { OPERATIONAL_EXPENSE_CATEGORIES, summarizeOperationalExpenses, type OperationalExpenseFilterValues } from './operational-expenses';
import { useCreateExpense, useExpenses } from './useExpenses';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(OPERATIONAL_EXPENSE_CATEGORIES, { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
  attachment_url: z.string().nullable().optional(),
});

function ExpenseMetric({ label, value, helper, icon: Icon }: Readonly<{ label: string; value: string; helper: string; icon: typeof WalletCards }>) {
  return (
    <Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-black text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></div>
      </CardContent>
    </Card>
  );
}

export function toLocalDateInputValue(date: Date = new Date()) {
  return getTodayLocalDateString(date);
}

export function ExpensesPage() {
  const [filters, setFilters] = useState<OperationalExpenseFilterValues>({ propertyId: '', category: '', from: '', to: '' });
  const propertiesQuery = useProperties({ page: 1, pageSize: 500, search: '', status: 'all' });
  const expensesQuery = useExpenses(filters);
  const createExpense = useCreateExpense();
  const propertyRows = propertiesQuery.data?.rows ?? [];
  const expenses = expensesQuery.data ?? [];
  const summary = summarizeOperationalExpenses(expenses);
  const locale = getCompanyLocale(defaultCompanyLocalSettings);

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { property_id: '', category: 'صيانة', amount: 0, expense_date: toLocalDateInputValue(), description: '', attachment_url: null },
  });

  const onCreateExpense = (values: ExpenseFormValues) => {
    createExpense.mutate(
      {
        property_id: values.property_id,
        category: values.category,
        amount: values.amount,
        expense_date: values.expense_date,
        description: values.description?.trim() ? values.description.trim() : null,
        attachment_url: values.attachment_url ?? null,
      },
      { onSuccess: () => expenseForm.reset({ property_id: '', category: 'صيانة', amount: 0, expense_date: toLocalDateInputValue(), description: '', attachment_url: null }) },
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">المصاريف التشغيلية</p>
          <h2 className="text-3xl font-black tracking-tight">المصاريف</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">تسجيل ومراجعة مصاريف العقارات من مصدر البيانات الحالي مع فلاتر للعقار والتصنيف والتاريخ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild><Link to="/financials"><ArrowRight className="me-2 size-4" />المالية</Link></Button>
          <Button variant="secondary" asChild><Link to="/reports"><ReceiptText className="me-2 size-4" />التقارير</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExpenseMetric label="عدد المصاريف" value={summary.visibleCount.toLocaleString(locale)} helper="ضمن الفلاتر الحالية" icon={ReceiptText} />
        <ExpenseMetric label="إجمالي المبلغ" value={formatCompanyMoney(defaultCompanyLocalSettings, summary.visibleAmount)} helper="للمصاريف المعروضة" icon={Banknote} />
        <ExpenseMetric label="العقارات المتأثرة" value={summary.byPropertyCount.toLocaleString(locale)} helper="عقارات لديها مصاريف" icon={WalletCards} />
        <ExpenseMetric label="التصنيفات" value={summary.byCategoryCount.toLocaleString(locale)} helper="تصنيفات مستخدمة" icon={CalendarDays} />
      </div>

      {propertiesQuery.isError ? <EmptyState title="تعذر تحميل العقارات" description="يمكنك إعادة المحاولة بعد لحظات قبل تسجيل مصروف جديد." role="alert" ariaLive="assertive" /> : null}
      {expensesQuery.isError ? <EmptyState title="تعذر تحميل المصاريف" description="أعد المحاولة أو غيّر عوامل التصفية الحالية." role="alert" ariaLive="assertive" /> : null}

      <ExpensesSection
        expenses={expenses}
        propertyRows={propertyRows}
        filters={filters}
        onFiltersChange={setFilters}
        expenseForm={expenseForm}
        isCreateExpensePending={createExpense.isPending || propertiesQuery.isLoading}
        onCreateExpense={onCreateExpense}
      />
    </div>
  );
}
