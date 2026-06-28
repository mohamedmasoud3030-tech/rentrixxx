import type { InvoiceStatus, PaymentReceipt } from '@/domain/types';
import { isValidISODateString, validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type ReceiptCreateInput = Readonly<Omit<PaymentReceipt, 'id' | 'createdAt'>>;

function getInvoicePaidAmount(receipts: readonly PaymentReceipt[], invoiceId: string): number {
  return receipts.filter((receipt) => receipt.invoiceId === invoiceId).reduce((total, receipt) => total + receipt.amount, 0);
}

function getNextInvoiceStatus(invoiceAmount: number, nextPaidAmount: number): InvoiceStatus {
  return nextPaidAmount >= invoiceAmount ? 'paid' : 'partially_paid';
}

export const receiptRepo = {
  list: () => readMockDatabase((state) => state.receipts),
  getById: (receiptId: string) => readMockDatabase((state) => state.receipts.find((receipt) => receipt.id === receiptId) ?? null),
  create: (input: ReceiptCreateInput) => writeMockDatabase((state) => {
    const invoice = state.invoices.find((candidate) => candidate.id === input.invoiceId);
    if (!invoice || invoice.status === 'cancelled') throw new MockRepositoryError('يجب إنشاء سند القبض من فاتورة قائمة وغير ملغاة.');

    const amountCheck = validatePositiveAmount(input.amount);
    if (!amountCheck.isValid) throw new MockRepositoryError(amountCheck.message ?? 'قيمة سند القبض غير صالحة.');

    if (!isValidISODateString(input.paymentDate)) {
      throw new MockRepositoryError('تاريخ سند القبض غير صالح.');
    }

    const currentPaidAmount = getInvoicePaidAmount(state.receipts, invoice.id);
    const remainingAmount = invoice.amount - currentPaidAmount;
    if (remainingAmount <= 0 || input.amount > remainingAmount) {
      throw new MockRepositoryError('قيمة سند القبض تتجاوز المتبقي على الفاتورة.');
    }

    const receipt: PaymentReceipt = {
      ...input,
      id: `receipt-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    const nextPaidAmount = currentPaidAmount + receipt.amount;
    const nextStatus = getNextInvoiceStatus(invoice.amount, nextPaidAmount);

    return {
      nextState: {
        ...state,
        receipts: [...state.receipts, receipt],
        invoices: state.invoices.map((candidate) => candidate.id === invoice.id ? { ...candidate, status: nextStatus } : candidate),
      },
      data: receipt,
    };
  }),
};
