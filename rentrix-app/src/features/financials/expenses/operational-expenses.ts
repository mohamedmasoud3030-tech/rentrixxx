import type { Expense, Property } from '@/types/domain';

export const OPERATIONAL_EXPENSE_CATEGORIES = ['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'] as const;

export type OperationalExpenseCategory = (typeof OPERATIONAL_EXPENSE_CATEGORIES)[number];

export type OperationalExpenseFilterValues = {
  propertyId: string;
  category: string;
  costCenterId: string;
  from: string;
  to: string;
};

export type OperationalExpensesSummary = {
  visibleCount: number;
  visibleAmount: number;
  byPropertyCount: number;
  byCategoryCount: number;
};

export function buildExpensePropertyLabel(expense: Expense, propertyById: ReadonlyMap<string, Property>): string {
  const property = propertyById.get(expense.property_id);
  if (property?.title && property.title.trim().length > 0) {
    return property.title;
  }

  return 'عقار غير معروف';
}

export function summarizeOperationalExpenses(expenses: readonly Expense[]): OperationalExpensesSummary {
  const categorySet = new Set<string>();
  const propertySet = new Set<string>();
  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;
    categorySet.add(expense.category);
    propertySet.add(expense.property_id);
  }

  return {
    visibleCount: expenses.length,
    visibleAmount: total,
    byPropertyCount: propertySet.size,
    byCategoryCount: categorySet.size,
  };
}
