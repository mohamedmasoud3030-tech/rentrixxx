import { useMemo, useRef, useState } from 'react';
import type { Payment } from '@/types/domain';
import { getTodayLocalDateString, isValidDateInput } from '../financials-date-utils';
import { getSafeRemainingAmount, toFinancialNumber } from '../financialMath';
import { summarizeInvoices, type InvoiceDetail, type InvoiceStatusFilter } from '../invoices/invoiceService';
import { useGenerateInvoices, useInvoice, useInvoices } from '../invoices/useInvoices';
import { usePostPayment } from '../payments/usePayments';
import { useReceipt, useReceipts } from '../receipts/useReceipts';
import { InvoiceDetailSection } from './invoice-detail-section';
import { InvoiceListSection } from './invoice-list-section';
import { ReceiptsSection } from './receipts-section';

function getAmountValidationMessage({
  amount,
  amountValue,
  invoiceDetail,
  paymentDate,
  rawAmountValue,
  selectedInvoiceId,
}: Readonly<{
  amount: string;
  amountValue: number;
  invoiceDetail: InvoiceDetail | undefined;
  paymentDate: string;
  rawAmountValue: number;
  selectedInvoiceId: string;
}>) {
  if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) return 'اختر فاتورة صالحة أولاً';
  if (!amount.trim()) return 'المبلغ مطلوب';
  if (!Number.isFinite(rawAmountValue)) return 'المبلغ يجب أن يكون رقماً صالحاً';
  if (amountValue <= 0) return 'المبلغ يجب أن يكون أكبر من صفر';
  if (amountValue > getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount)) return 'المبلغ يجب ألا يتجاوز الرصيد المتبقي';
  if (!paymentDate) return 'تاريخ الدفع مطلوب';
  if (!isValidDateInput(paymentDate)) return 'تاريخ الدفع غير صالح';
  return '';
}

export function InvoiceWorkspaceSection() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Payment['payment_method']>('cash');
  const [paymentDate, setPaymentDate] = useState(() => getTodayLocalDateString());
  const [paymentReference, setPaymentReference] = useState('');
  const quickPaySubmitRef = useRef(false);

  const invoicesQuery = useInvoices({ status, search: invoiceSearch });
  const invoiceQuery = useInvoice(selectedInvoiceId);
  const generate = useGenerateInvoices();
  const postPayment = usePostPayment();
  const receiptsQuery = useReceipts({ limit: 10 });
  const receiptQuery = useReceipt(selectedReceiptId);

  const invoices = invoicesQuery.data ?? [];
  const summary = useMemo(() => summarizeInvoices(invoices), [invoices]);
  const invoiceDetail = invoiceQuery.data;
  const remaining = useMemo(
    () => (invoiceDetail ? getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount) : 0),
    [invoiceDetail],
  );
  const rawAmountValue = Number(amount);
  const amountValue = toFinancialNumber(amount);
  const amountValidationMessage = useMemo(
    () => getAmountValidationMessage({ amount, amountValue, invoiceDetail, paymentDate, rawAmountValue, selectedInvoiceId }),
    [amount, amountValue, invoiceDetail, paymentDate, rawAmountValue, selectedInvoiceId],
  );
  const isPaymentDisabled = quickPaySubmitRef.current || postPayment.isPending || remaining <= 0 || Boolean(amountValidationMessage);
  const hasInvoiceFilter = status !== 'all' || invoiceSearch.trim().length > 0;

  const onPostPayment = () => {
    if (quickPaySubmitRef.current || postPayment.isPending) return;
    if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) return;

    const currentRemaining = getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount);
    const currentRawAmount = Number(amount);
    const currentAmount = toFinancialNumber(amount);

    if (!amount.trim() || !Number.isFinite(currentRawAmount) || currentAmount <= 0 || currentAmount > currentRemaining || !isValidDateInput(paymentDate)) return;

    quickPaySubmitRef.current = true;
    postPayment.mutate(
      {
        invoice_id: invoiceDetail.id,
        amount: currentAmount,
        method: paymentMethod,
        date: paymentDate,
        reference: paymentReference.trim() ? paymentReference.trim() : null,
      },
      {
        onSuccess: () => {
          setAmount('');
          setPaymentReference('');
        },
        onSettled: () => {
          quickPaySubmitRef.current = false;
        },
      },
    );
  };

  return (
    <>
      <InvoiceListSection
        summary={summary}
        status={status}
        invoiceSearch={invoiceSearch}
        invoices={invoices}
        selectedInvoiceId={selectedInvoiceId}
        isLoading={invoicesQuery.isLoading}
        isError={invoicesQuery.isError}
        error={invoicesQuery.error}
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
        isLoading={invoiceQuery.isLoading}
        isError={invoiceQuery.isError}
        error={invoiceQuery.error}
        amount={amount}
        method={paymentMethod}
        paymentDate={paymentDate}
        reference={paymentReference}
        amountValidationMessage={amountValidationMessage}
        isPaymentPending={postPayment.isPending}
        isPaymentDisabled={isPaymentDisabled}
        onAmountChange={setAmount}
        onMethodChange={setPaymentMethod}
        onPaymentDateChange={setPaymentDate}
        onReferenceChange={setPaymentReference}
        onPostPayment={onPostPayment}
      />

      <ReceiptsSection
        receipts={receiptsQuery.data ?? []}
        selectedReceiptId={selectedReceiptId}
        receiptDetail={receiptQuery.data}
        isReceiptsLoading={receiptsQuery.isLoading}
        isReceiptsError={receiptsQuery.isError}
        receiptsError={receiptsQuery.error}
        isReceiptDetailLoading={receiptQuery.isLoading}
        isReceiptDetailError={receiptQuery.isError}
        receiptDetailError={receiptQuery.error}
        onSelectReceipt={setSelectedReceiptId}
      />
    </>
  );
}
