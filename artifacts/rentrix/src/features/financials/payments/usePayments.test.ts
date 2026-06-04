import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoiceKeys } from '../invoices/useInvoices';
import { receiptKeys } from '../receipts/useReceipts';
import { financialReportKeys } from '../reports/useFinancialReports';

const mutationMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn((options) => options),
  useQueryClient: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mutationMock.useMutation,
  useQueryClient: mutationMock.useQueryClient,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mutationMock.toastSuccess,
    error: mutationMock.toastError,
  },
}));

vi.mock('./paymentService', () => ({
  recordInvoicePaymentAtomic: vi.fn(),
}));

describe('usePostPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
    mutationMock.invalidateQueries.mockResolvedValue(undefined);
  });

  it('invalidates invoice and receipt queries after a successful payment post', async () => {
    const { usePostPayment } = await import('./usePayments');

    const mutationOptions = usePostPayment() as unknown as { onSuccess: () => Promise<void> };
    await mutationOptions.onSuccess();

    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: invoiceKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: receiptKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: financialReportKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم تسجيل الدفعة بنجاح');
  });
});
