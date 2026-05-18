import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader><CardTitle>المصاريف التشغيلية</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">تكلفة طلبات الصيانة في قسم الصيانة تبقى تقديرية ولا يتم تحويلها تلقائياً إلى مصروف.</p>

        <div className="grid gap-2 rounded border p-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <p>عدد المصاريف المعروضة: <strong>{summary.visibleCount}</strong></p>
          <p>إجمالي المبلغ المعروض: <strong>{formatMoney(summary.visibleAmount)}</strong></p>
          <p>عدد العقارات المعروضة: <strong>{summary.byPropertyCount}</strong></p>
          <p>عدد التصنيفات المعروضة: <strong>{summary.byCategoryCount}</strong></p>
        </div>

        <div className="grid gap-2 rounded border p-3 md:grid-cols-2 lg:grid-cols-4">
          <select
            className="rounded border px-2 py-2"
            value={filters.propertyId}
            onChange={(event) => {
              onFiltersChange({ ...filters, propertyId: event.target.value });
            }}
          >
            <option value="">كل العقارات</option>
            {propertyRows.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
          <select
            className="rounded border px-2 py-2"
            value={filters.category}
            onChange={(event) => {
              onFiltersChange({ ...filters, category: event.target.value });
            }}
          >
            <option value="">كل التصنيفات</option>
            {OPERATIONAL_EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <input className="rounded border px-2 py-2" type="date" value={filters.from} onChange={(event) => { onFiltersChange({ ...filters, from: event.target.value }); }} />
          <input className="rounded border px-2 py-2" type="date" value={filters.to} onChange={(event) => { onFiltersChange({ ...filters, to: event.target.value }); }} />
        </div>

        {expenses.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مصاريف مطابقة للفلاتر الحالية.</p> : null}
        {expenses.map((expense) => (
          <p key={expense.id} className="rounded border p-2 text-sm">
            {formatDate(expense.expense_date)} — {buildExpensePropertyLabel(expense, propertyById)} — {expense.category} — {formatMoney(expense.amount)}
          </p>
        ))}

        <form className="grid gap-3 rounded border p-4" onSubmit={expenseForm.handleSubmit(onCreateExpense)}>
          <select className="rounded border px-2 py-2" {...expenseForm.register('property_id')}>
            <option value="">اختر العقار</option>
            {propertyRows.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>

          <select className="rounded border px-2 py-2" {...expenseForm.register('category')}>
            {OPERATIONAL_EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>

          <input className="rounded border px-2 py-2" type="number" min="0.01" step="0.01" placeholder="المبلغ" {...expenseForm.register('amount')} />
          <input className="rounded border px-2 py-2" type="date" {...expenseForm.register('expense_date')} />
          <textarea className="rounded border px-2 py-2" placeholder="الوصف (اختياري)" {...expenseForm.register('description')} />

          <Button type="submit" disabled={isCreateExpensePending}>{isCreateExpensePending ? 'جارٍ الحفظ...' : 'إضافة مصروف'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
