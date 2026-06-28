import type { Invoice } from '@/domain/types';
import { isValidISODateString, validatePositiveAmount } from '@/domain/validators';
import { MockRepositoryError, readMockDatabase, writeMockDatabase } from './base';

type InvoiceCreateInput = Readonly<Omit<Invoice, 'id' | 'createdAt'>>;

export const invoiceRepo = {
  list: () => readMockDatabase((state) => state.invoices),
  getById: (invoiceId: string) => readMockDatabase((state) => state.invoices.find((invoice) => invoice.id === invoiceId) ?? null),
  create: (input: InvoiceCreateInput) => writeMockDatabase((state) => {
    const contractExists = state.contracts.some((contract) => contract.id === input.contractId);
    if (!contractExists) throw new MockRepositoryError('يجب ربط الفاتورة بعقد قائم.');

    const amountCheck = validatePositiveAmount(input.amount);
    if (!amountCheck.isValid) throw new MockRepositoryError(amountCheck.message ?? 'قيمة الفاتورة غير صالحة.');

    if (!isValidISODateString(input.dueDate)) {
      throw new MockRepositoryError('تاريخ استحقاق الفاتورة غير صالح.');
    }

    const invoice: Invoice = {
      ...input,
      id: `invoice-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };

    return { nextState: { ...state, invoices: [...state.invoices, invoice] }, data: invoice };
  }),
};
