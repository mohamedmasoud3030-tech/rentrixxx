import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Expense, Property } from '@/types/domain';
import { formatDate, formatMoney } from './financials-formatters';
import {
  buildExpensePropertyLabel,
  OPERATIONAL_EXPENSE_CATEGORIES,
  summarizeOperationalExpenses,
  type OperationalExpenseCategory,
  type OperationalExpenseFilterValues,
} from '../expenses/operational-expenses';

export type ExpenseFormValues = {
  property_id: string;
  category: OperationalExpenseCategory;
  amount: number;
  expense_date: string;
  description?: string;
};

type ExpensesSectionProps = Readonly<{
  expenses: Expense[];
  propertyRows: Property[];
  filters: OperationalExpenseFilterValues;
  onFiltersChange: (nextFilters: OperationalExpenseFilterValues) => void;
  expenseForm: UseFormReturn<ExpenseFormValues>;
  isCreateExpensePending: boolean;
  onCreateExpense: (values: ExpenseFormValues) => void;
}>;

export function ExpensesSection({ expenses, propertyRows, filters, onFiltersChange, expenseForm, isCreateExpensePending, onCreateExpense }: ExpensesSectionProps) {
  const propertyById = new Map(propertyRows.map((property) => [property.id, property]));
  const summary = summarizeOperationalExpenses(expenses);

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>المصاريف التشغيلية</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">تكلفة طلبات الصيانة في قسم الصيانة تبقى تقديرية ولا يتم تحويلها تلقائياً إلى مصروف.</p>

        {/* Summary strip */}
        <div className="grid gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>عدد المصاريف: <strong>{summary.visibleCount}</strong></p>
          <p>الإجمالي: <strong>{formatMoney(summary.visibleAmount)}</strong></p>
          <p>العقارات: <strong>{summary.byPropertyCount}</strong></p>
          <p>التصنيفات: <strong>{summary.byCategoryCount}</strong></p>
        </div>

        {/* Filters */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={filters.propertyId}
            onChange={(e) => onFiltersChange({ ...filters, propertyId: e.target.value })}
          >
            <option value="">كل العقارات</option>
            {propertyRows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select
            value={filters.category}
            onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
          >
            <option value="">كل التصنيفات</option>
            {OPERATIONAL_EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="date" value={filters.from} onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })} />
          <Input type="date" value={filters.to} onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })} />
        </div>

        {/* Expense list */}
        {expenses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            لا توجد مصاريف مطابقة للفلاتر الحالية.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{formatDate(expense.expense_date)}</span>
                <span className="flex-1 truncate">{buildExpensePropertyLabel(expense, propertyById)} — {expense.category}</span>
                <span className="font-bold tabular-nums">{formatMoney(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Create form */}
        <form className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2" onSubmit={expenseForm.handleSubmit(onCreateExpense)}>
          <Select {...expenseForm.register('property_id')}>
            <option value="">اختر العقار</option>
            {propertyRows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select {...expenseForm.register('category')}>
            {OPERATIONAL_EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="number" min="0.01" step="0.01" placeholder="المبلغ" {...expenseForm.register('amount')} />
          <Input type="date" {...expenseForm.register('expense_date')} />
          <div className="sm:col-span-2">
            <Textarea placeholder="الوصف (اختياري)" className="min-h-16" {...expenseForm.register('description')} />
          </div>
          <Button type="submit" disabled={isCreateExpensePending} className="sm:col-span-2">
            {isCreateExpensePending ? 'جارٍ الحفظ...' : 'إضافة مصروف'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
