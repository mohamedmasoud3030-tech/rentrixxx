import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { FileText, ReceiptText, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProperties } from '@/features/properties/use-properties';
import { cn } from '@/lib/utils';
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

type FinancialsTab = 'invoices' | 'receipts' | 'expenses' | 'actions';

const financialTabs = [
  ['invoices', 'الفواتير', 'اختيار الفواتير وتسجيل الدفعات', FileText],
  ['receipts', 'الإيصالات', 'فتح سجل الإيصالات والطباعة', ReceiptText],
  ['expenses', 'المصاريف', 'تسجيل ومراجعة مصاريف العقارات', WalletCards],
  ['actions', 'إجراءات سريعة', 'روابط تشغيلية يومية', WalletCards],
] as const satisfies readonly [FinancialsTab, string, string, typeof FileText][];

export function FinancialsPage() {
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const [activeTab, setActiveTab] = useState<FinancialsTab>('invoices');
  const [filters, setFilters] = useState<OperationalExpenseFilterValues>({ propertyId: '', category: '', from: '', to: '' });
  const { data: expenses = [] } = useExpenses(filters);
  const reportFilters = useMemo(() => getCurrentMonthReportRange(), []);
  const collectionReport = useCollectionSummaryReport(reportFilters);
  const createExpense = useCreateExpense();
  const propertyRows = properties?.rows ?? [];

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-primary">مركز التحصيل</p>
          <h2 className="text-3xl font-black tracking-tight">المالية</h2>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
            تبويبات مختصرة للفواتير والإيصالات والمصاريف حتى لا تظهر كل أدوات التحصيل مكدسة على شاشة واحدة، خصوصاً على الجوال.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild><Link to="/invoices">صفحة الفواتير</Link></Button>
          <Button variant="secondary" asChild><Link to="/receipts">سجل الإيصالات</Link></Button>
          <Button variant="secondary" asChild><Link to="/expenses">صفحة المصاريف</Link></Button>
        </div>
      </div>

      <FinancialReportsPreviewSection
        reportFilters={reportFilters}
        collectionSummary={collectionReport.data}
        isLoading={collectionReport.isLoading}
        isError={collectionReport.isError}
        error={collectionReport.error}
      />

      <Card>
        <CardContent className="space-y-5 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="أقسام المالية">
            {financialTabs.map(([tab, label, description, Icon]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 text-right transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5',
                  activeTab === tab ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background',
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-black">{label}</span>
                  <span className={cn('block truncate text-[11px] font-bold', activeTab === tab ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{description}</span>
                </span>
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {activeTab === 'invoices' ? <InvoiceWorkspaceSection /> : null}
            {activeTab === 'receipts' ? (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-black">الإيصالات والطباعة</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">استخدم صفحة الإيصالات للبحث برقم الإيصال أو المستأجر وفتح تفاصيل الطباعة.</p>
                  </div>
                  <Button asChild><Link to="/receipts">فتح سجل الإيصالات</Link></Button>
                </CardContent>
              </Card>
            ) : null}
            {activeTab === 'expenses' ? (
              <ExpensesSection
                expenses={expenses}
                propertyRows={propertyRows}
                filters={filters}
                onFiltersChange={setFilters}
                expenseForm={expenseForm}
                isCreateExpensePending={createExpense.isPending}
                onCreateExpense={onCreateExpense}
              />
            ) : null}
            {activeTab === 'actions' ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Button asChild><Link to="/invoices">مراجعة الفواتير</Link></Button>
                <Button variant="secondary" asChild><Link to="/receipts">طباعة إيصال</Link></Button>
                <Button variant="secondary" asChild><Link to="/arrears">متابعة المتأخرات</Link></Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ArrearsWorkspaceSection />
    </div>
  );
}
