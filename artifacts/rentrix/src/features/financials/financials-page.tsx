import { zodResolver } from '@hookform/resolvers/zod';
import { Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { runOperationalPrint } from '@/lib/operationalPrint';
import { useProperties } from '@/features/properties/use-properties';
import { ArrearsWorkspaceSection } from './components/arrears-workspace-section';
import { ExpensesSection, type ExpenseFormValues } from './components/expenses-section';
import { FinancialReportsPreviewSection } from './components/financial-reports-preview-section';
import { InvoiceWorkspaceSection } from './components/invoice-workspace-section';
import { OPERATIONAL_EXPENSE_CATEGORIES, type OperationalExpenseFilterValues } from './expenses/operational-expenses';
import { useCreateExpense, useExpenses } from './expenses/useExpenses';
import { useCollectionSummaryReport } from './reports/useFinancialReports';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(OPERATIONAL_EXPENSE_CATEGORIES, { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
});

function getCurrentMonthReportRange() {
  const now = new Date();
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    dateFrom: firstDay.toISOString().slice(0, 10),
    dateTo: lastDay.toISOString().slice(0, 10),
    status: 'all' as const,
  };
}

export function FinancialsPage() {
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const [filters, setFilters] = useState<OperationalExpenseFilterValues>({ propertyId: '', category: '', from: '', to: '' });
  const { data: expenses = [] } = useExpenses(filters);
  const reportFilters = useMemo(() => getCurrentMonthReportRange(), []);
  const collectionReport = useCollectionSummaryReport(reportFilters);
  const createExpense = useCreateExpense();
  const propertyRows = properties?.rows ?? [];
  const hasFinancialPrintData = Boolean(collectionReport.data);

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      property_id: '',
      category: 'صيانة',
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      description: '',
    },
  });

  const onCreateExpense = (values: ExpenseFormValues) => {
    createExpense.mutate(
      {
        property_id: values.property_id,
        category: values.category,
        amount: values.amount,
        expense_date: values.expense_date,
        description: values.description?.trim() ? values.description.trim() : null,
      },
      {
        onSuccess: () => {
          expenseForm.reset({
            property_id: '',
            category: 'صيانة',
            amount: 0,
            expense_date: new Date().toISOString().slice(0, 10),
            description: '',
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-end">
        <Button variant="secondary" disabled={!hasFinancialPrintData || collectionReport.isLoading || collectionReport.isError} onClick={() => { const err = runOperationalPrint(hasFinancialPrintData, collectionReport.isLoading, collectionReport.isError); if (err) globalThis.alert(err); }}><Printer className="ms-2 size-4" />طباعة الملخص المالي التشغيلي</Button>
      </div>
      <FinancialReportsPreviewSection
        reportFilters={reportFilters}
        collectionSummary={collectionReport.data}
        isLoading={collectionReport.isLoading}
        isError={collectionReport.isError}
        error={collectionReport.error}
      />

      <ArrearsWorkspaceSection />
      <InvoiceWorkspaceSection />

      <ExpensesSection
        expenses={expenses}
        propertyRows={propertyRows}
        filters={filters}
        onFiltersChange={setFilters}
        expenseForm={expenseForm}
        isCreateExpensePending={createExpense.isPending}
        onCreateExpense={onCreateExpense}
      />
    </div>
  );
}
