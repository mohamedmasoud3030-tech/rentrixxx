import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileAttachmentField } from '@/components/ui/file-attachment-field';
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
import { getTodayLocalDateString } from '../financials-date-utils';

export type ExpenseFormValues = {
  property_id: string;
  category: OperationalExpenseCategory;
  amount: number;
  expense_date: string;
  description?: string;
  attachment_url?: string | null;
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

function escapeCsvCell(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function buildExpensesCsv(expenses: readonly Expense[], propertyRows: readonly Property[]) {
  const propertyById = new Map(propertyRows.map((property) => [property.id, property]));
  const rows = expenses.map((expense) => [
    expense.expense_date,
    buildExpensePropertyLabel(expense, propertyById),
    expense.category,
    expense.amount,
    expense.description ?? '',
  ]);

  return [
    ['date', 'property', 'category', 'amount', 'description'],
    ...rows,
  ].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExpensesSection({ expenses, propertyRows, filters, onFiltersChange, expenseForm, isCreateExpensePending, onCreateExpense }: ExpensesSectionProps) {
  const propertyById = new Map(propertyRows.map((property) => [property.id, property]));
  const summary = summarizeOperationalExpenses(expenses);
  const hasFilters = Boolean(filters.propertyId || filters.category || filters.from || filters.to);
  const clearFilters = () => onFiltersChange({ propertyId: '', category: '', from: '', to: '' });
  const exportVisibleExpenses = () => downloadCsv(`rentrix-expenses-${getTodayLocalDateString()}.csv`, buildExpensesCsv(expenses, propertyRows));

  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>المصاريف التشغيلية</CardTitle>
          <CardDescription>فلترة المصاريف وتصدير النتائج الظاهرة أو تسجيل مصروف جديد مرتبط بعقار.</CardDescription>
        </div>
        <Button variant="secondary" onClick={exportVisibleExpenses} disabled={expenses.length === 0}>تصدير CSV</Button>
      </CardHeader>
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
        <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm font-bold">
            <span>العقار</span>
            <Select
              value={filters.propertyId}
              onChange={(e) => onFiltersChange({ ...filters, propertyId: e.target.value })}
            >
              <option value="">كل العقارات</option>
              {propertyRows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            <span>التصنيف</span>
            <Select
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
            >
              <option value="">كل التصنيفات</option>
              {OPERATIONAL_EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm font-bold"><span>من تاريخ</span><Input type="date" value={filters.from} onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })} /></label>
          <label className="space-y-1 text-sm font-bold"><span>إلى تاريخ</span><Input type="date" value={filters.to} onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })} /></label>
          {hasFilters ? <Button variant="secondary" className="sm:col-span-2 lg:col-span-4" onClick={clearFilters}>مسح الفلاتر</Button> : null}
        </div>

        {/* Expense list */}
        {expenses.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'لا توجد مصاريف مطابقة' : 'لا توجد مصاريف بعد'}
            description={hasFilters ? 'غيّر الفلاتر أو امسحها لعرض نتائج أخرى.' : 'سجّل أول مصروف تشغيلي من النموذج أدناه.'}
          />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-3">
                <span className="text-muted-foreground">{formatDate(expense.expense_date)}</span>
                <span className="min-w-0 truncate">{buildExpensePropertyLabel(expense, propertyById)} — {expense.category}</span>
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
          <div className="sm:col-span-2">
            <Controller
              control={expenseForm.control}
              name="attachment_url"
              render={({ field }) => (
                <FileAttachmentField label="إيصال مرفق (اختياري)" value={field.value ?? null} onChange={field.onChange} />
              )}
            />
          </div>
          <Button type="submit" disabled={isCreateExpensePending} className="sm:col-span-2">
            {isCreateExpensePending ? 'جارٍ الحفظ...' : 'إضافة مصروف'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
