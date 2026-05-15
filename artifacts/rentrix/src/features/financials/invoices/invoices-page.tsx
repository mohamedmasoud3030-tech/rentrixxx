import { useMemo, useRef, useState } from 'react';
import type { Payment } from '@/types/domain';
import { InvoiceDetailSection } from '../components/invoice-detail-section';
import { InvoiceListSection } from '../components/invoice-list-section';
import { ReceiptsSection } from '../components/receipts-section';
import { getTodayLocalDateString, isValidDateInput } from '../financials-date-utils';
import { getSafeRemainingAmount, toFinancialNumber } from '../financialMath';
import { summarizeInvoices, type InvoiceDetail, type InvoiceStatusFilter } from './invoiceService';
import { useGenerateInvoices, useInvoice, useInvoices } from './useInvoices';
import { usePostPayment } from '../payments/usePayments';
import { useReceipt, useReceipts } from '../receipts/useReceipts';

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
  if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) {
    return 'اختر فاتورة صالحة أولاً';
  }

  if (!amount.trim()) {
    return 'المبلغ مطلوب';
  }

  if (!Number.isFinite(rawAmountValue)) {
    return 'المبلغ يجب أن يكون رقماً صالحاً';
  }

  if (amountValue <= 0) {
    return 'المبلغ يجب أن يكون أكبر من صفر';
  }

  if (amountValue > getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount)) {
    return 'المبلغ يجب ألا يتجاوز الرصيد المتبقي';
  }

  if (!paymentDate) {
    return 'تاريخ الدفع مطلوب';
  }

  if (!isValidDateInput(paymentDate)) {
    return 'تاريخ الدفع غير صالح';
  }

  return '';
}

export function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatusFilter>('unpaid');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Payment['payment_method']>('cash');
  const [paymentDate, setPaymentDate] = useState(() => getTodayLocalDateString());
  const [paymentReference, setPaymentReference] = useState('');
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

  const summary = useMemo(() => summarizeInvoices(invoices), [invoices]);
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
    if (quickPaySubmitRef.current || postPayment.isPending) {
      return;
    }

    if (!selectedInvoiceId || !invoiceDetail || invoiceDetail.id !== selectedInvoiceId) {
      return;
    }

    const currentRemaining = getSafeRemainingAmount(invoiceDetail.amount, invoiceDetail.paid_amount);
    const currentRawAmount = Number(amount);
    const currentAmount = toFinancialNumber(amount);

    if (!amount.trim() || !Number.isFinite(currentRawAmount) || currentAmount <= 0 || currentAmount > currentRemaining || !isValidDateInput(paymentDate)) {
      return;
    }

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
    <div className="space-y-6" dir="rtl">
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
    </div>
  );
}
