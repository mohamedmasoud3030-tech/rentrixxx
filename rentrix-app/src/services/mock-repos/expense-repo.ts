import type { Expense } from '@/domain/types';
import { isValidISODateString, validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type ExpenseCreateInput = Readonly<Omit<Expense, 'id' | 'createdAt' | 'isArchived'>>;

export const expenseRepo = {
  list: () => readMockDatabase((state) => state.expenses.filter((expense) => !expense.isArchived)),
  getById: (expenseId: string) => readMockDatabase((state) => state.expenses.find((expense) => expense.id === expenseId) ?? null),
  create: (input: ExpenseCreateInput) => writeMockDatabase((state) => {
    const propertyExists = state.properties.some((property) => property.id === input.propertyId && !property.isArchived);
    if (!propertyExists) throw new MockRepositoryError('يجب ربط المصروف بعقار نشط.');

    if (input.unitId) {
      const unitBelongsToProperty = state.units.some((unit) => unit.id === input.unitId && unit.propertyId === input.propertyId && !unit.isArchived);
      if (!unitBelongsToProperty) throw new MockRepositoryError('يجب أن تكون الوحدة المرتبطة بالمصروف تابعة للعقار المحدد.');
    }

    const amountCheck = validatePositiveAmount(input.amount);
    if (!amountCheck.isValid) throw new MockRepositoryError(amountCheck.message ?? 'قيمة المصروف غير صالحة.');

    if (!isValidISODateString(input.expenseDate)) {
      throw new MockRepositoryError('تاريخ المصروف غير صالح.');
    }

    const expense: Expense = {
      ...input,
      id: `expense-${crypto.randomUUID()}`,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    return { nextState: { ...state, expenses: [...state.expenses, expense] }, data: expense };
  }),
  archive: (expenseId: string) => writeMockDatabase((state) => {
    const expenses = state.expenses.map((expense) => expense.id === expenseId ? { ...expense, isArchived: true } : expense);
    return { nextState: { ...state, expenses }, data: expenses.find((expense) => expense.id === expenseId) ?? null };
  }),
};
