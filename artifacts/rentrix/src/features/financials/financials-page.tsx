import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProperties } from '@/features/properties/use-properties';
import { ArrearsWorkflowSection } from './components/arrears-workflow-section';
import type { ArrearsBucketFilter } from './components/arrears-workflow-helpers';
import { ExpensesSection, type ExpenseFormValues } from './components/expenses-section';
import { FinancialReportsPreviewSection } from './components/financial-reports-preview-section';
import { InvoiceDetailSection } from './components/invoice-detail-section';
import { InvoiceListSection } from './components/invoice-list-section';
import { ReceiptsSection } from './components/receipts-section';
import { useExpenses, useCreateExpense } from './expenses/useExpenses';
import { getSafeRemainingAmount, toFinancialNumber } from './financialMath';
import { summarizeInvoices, type InvoiceStatusFilter } from './invoices/invoiceService';
import { useGenerateInvoices, useInvoice, useInvoices } from './invoices/useInvoices';
import { usePostPayment } from './payments/usePayments';
import { useReceipt, useReceipts } from './receipts/useReceipts';
import {
  useAgedReceivablesReport,
  useArrearsSummaryReport,
  useCollectionSummaryReport,
  useOverdueInvoicesReport,
} from './reports/useFinancialReports';

const expenseSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  category: z.enum(['صيانة', 'مرافق', 'إدارية', 'تأمين', 'أخرى'], { message: 'اختر التصنيف' }),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  expense_date: z.string().min(1, 'اختر التاريخ'),
  description: z.string().optional(),
});

function getTodayLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [amount, setAmount] = useState('');
  const [arrearsAsOf, setArrearsAsOf] = useState(() => getTodayLocalDateString());
  const [arrearsSearch, setArrearsSearch] = useState('');
  const [arrearsBucketFilter, setArrearsBucketFilter] = useState<ArrearsBucketFilter>('all');
  const quickPaySubmitRef = useRef(false);
  const {
    data: invoices = [],
    isLoading: isInvoicesLoading,
    isError: isInvoicesError,
    error: invoicesError,
  } = useInvoices({ status, search: invoiceSearch });
  const {
    data: invoiceDetail,
    isLoading: isInvoiceDetailLoading,
    isError: isInvoiceDetailError,
    error: invoiceDetailError,
  } = useInvoice(selectedInvoiceId);
  const generate = useGenerateInvoices();
  const postPayment = usePostPayment();
  const {
    data: receipts = [],
    isLoading: isReceiptsLoading,
    isError: isReceiptsError,
    error: receiptsError,
  } = useReceipts({ limit: 10 });
  const {
    data: receiptDetail,
    isLoading: isReceiptDetailLoading,
    isError: isReceiptDetailError,
    error: receiptDetailError,
  } = useReceipt(selectedReceiptId);
  const { data: properties } = useProperties({ page: 1, pageSize: 100, search: '', status: 'all' });
  const [filters] = useState({ propertyId: '', category: '', from: '', to: '' });
  const { data: expenses = [] } = useExpenses(filters);
  const reportFilters = useMemo(() => getCurrentMonthReportRange(), []);
  const {
    data: collectionSummary,
    isLoading: isCollectionSummaryLoading,
    isError: isCollectionSummaryError,
    error: collectionSummaryError,
  } = useCollectionSummaryReport(reportFilters);
  const arrearsReportFilters = useMemo(() => ({ asOf: arrearsAsOf }), [arrearsAsOf]);
  const {
    data: overdueInvoicesReport,
    isLoading: isOverdueInvoicesReportLoading,
    isError: isOverdueInvoicesReportError,
    error: overdueInvoicesReportError,
  } = useOverdueInvoicesReport(arrearsReportFilters);
  const {
    data: agedReceivablesReport,
    isLoading: isAgedReceivablesReportLoading,
    isError: isAgedReceivablesReportError,
    error: agedReceivablesReportError,
  } = useAgedReceivablesReport(arrearsReportFilters);
  const {
    data: arrearsSummaryReport,
    isLoading: isArrearsSummaryReportLoading,
    isError: isArrearsSummaryReportError,
    error: arrearsSummaryReportError,
  } = useArrearsSummaryReport(arrearsReportFilters);
  const createExpense = useCreateExpense();
  const summary = useMemo(() => summarizeInvoices(invoices), [invoices]);
  const remaining = useMemo(
    () => (invoiceDetail ? getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount) : 0),
    [invoiceDetail],
  );
  const rawAmountValue = Number(amount);
  const amountValue = toFinancialNumber(amount);
  const amountValidationMessage = useMemo(() => {
    if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) return 'اختر فاتورة صالحة أولاً';
    if (!amount.trim()) return 'المبلغ مطلوب';
    if (!Number.isFinite(rawAmountValue)) return 'المبلغ يجب أن يكون رقماً صالحاً';
    if (amountValue <= 0) return 'المبلغ يجب أن يكون أكبر من صفر';
    if (amountValue > getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount)) return 'المبلغ يجب ألا يتجاوز الرصيد المتبقي';
    return '';
  }, [amount, amountValue, invoiceDetail, rawAmountValue, selectedInvoiceId]);
  const isPaymentDisabled = quickPaySubmitRef.current || postPayment.isPending || remaining <= 0 || Boolean(amountValidationMessage);
  const hasInvoiceFilter = status !== 'all' || invoiceSearch.trim().length > 0;
  const propertyRows = properties?.rows ?? [];
  const isArrearsWorkflowLoading = isOverdueInvoicesReportLoading || isAgedReceivablesReportLoading || isArrearsSummaryReportLoading;
  const isArrearsWorkflowError = isOverdueInvoicesReportError || isAgedReceivablesReportError || isArrearsSummaryReportError;
  const arrearsWorkflowError = overdueInvoicesReportError ?? agedReceivablesReportError ?? arrearsSummaryReportError;

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

  const onPostPayment = () => {
    if (quickPaySubmitRef.current || postPayment.isPending) return;
    if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) return;
    const currentRemaining = getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount);
    const currentRawAmount = Number(amount);
    const currentAmount = toFinancialNumber(amount);
    if (!amount.trim() || !Number.isFinite(currentRawAmount) || currentAmount <= 0 || currentAmount > currentRemaining) return;

    quickPaySubmitRef.current = true;
    postPayment.mutate(
      {
        invoice_id: invoiceDetail.id,
        amount: currentAmount,
        method: 'cash',
        date: new Date().toISOString().slice(0, 10),
        reference: null,
      },
      {
        onSuccess: () => setAmount(''),
        onSettled: () => {
          quickPaySubmitRef.current = false;
        },
      },
    );
  };

  return <div className="space-y-6" dir="rtl">
    <FinancialReportsPreviewSection
      reportFilters={reportFilters}
      collectionSummary={collectionSummary}
      isLoading={isCollectionSummaryLoading}
      isError={isCollectionSummaryError}
      error={collectionSummaryError}
    />

    <ArrearsWorkflowSection
      asOf={arrearsAsOf}
      search={arrearsSearch}
      bucketFilter={arrearsBucketFilter}
      overdueReport={overdueInvoicesReport}
      agedReceivablesReport={agedReceivablesReport}
      arrearsSummaryReport={arrearsSummaryReport}
      selectedInvoiceId={selectedInvoiceId}
      isLoading={isArrearsWorkflowLoading}
      isError={isArrearsWorkflowError}
      error={arrearsWorkflowError}
      onAsOfChange={setArrearsAsOf}
      onSearchChange={setArrearsSearch}
      onBucketFilterChange={setArrearsBucketFilter}
      onSelectInvoice={setSelectedInvoiceId}
    />

    <InvoiceListSection
      summary={summary}
      status={status}
      invoiceSearch={invoiceSearch}
      invoices={invoices}
      selectedInvoiceId={selectedInvoiceId}
      isLoading={isInvoicesLoading}
      isError={isInvoicesError}
      error={invoicesError}
      isGenerating={generate.isPending}
      hasInvoiceFilter={hasInvoiceFilter}
      onStatusChange={setStatus}
      onInvoiceSearchChange={setInvoiceSearch}
      onGenerateInvoices={() => generate.mutate()}
      onSelectInvoice={setSelectedInvoiceId}
    />

    <InvoiceDetailSection
      selectedInvoiceId={selectedInvoiceId}
      invoiceDetail={invoiceDetail}
      remaining={remaining}
      isLoading={isInvoiceDetailLoading}
      isError={isInvoiceDetailError}
      error={invoiceDetailError}
      amount={amount}
      amountValidationMessage={amountValidationMessage}
      isPaymentPending={postPayment.isPending}
      isPaymentDisabled={isPaymentDisabled}
      onAmountChange={setAmount}
      onPostPayment={onPostPayment}
    />

    <ReceiptsSection
      receipts={receipts}
      selectedReceiptId={selectedReceiptId}
      receiptDetail={receiptDetail}
      isReceiptsLoading={isReceiptsLoading}
      isReceiptsError={isReceiptsError}
      receiptsError={receiptsError}
      isReceiptDetailLoading={isReceiptDetailLoading}
      isReceiptDetailError={isReceiptDetailError}
      receiptDetailError={receiptDetailError}
      onSelectReceipt={setSelectedReceiptId}
    />

    <ExpensesSection
      expenses={expenses}
      propertyRows={propertyRows}
      expenseForm={expenseForm}
      isCreateExpensePending={createExpense.isPending}
      onCreateExpense={onCreateExpense}
    />
  </div>;
}
