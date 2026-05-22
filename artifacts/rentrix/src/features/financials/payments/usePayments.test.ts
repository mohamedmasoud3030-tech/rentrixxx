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
  postReceiptAtomic: vi.fn(),
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

vi.mock('@/services/financial/paymentService', () => ({
  postReceiptAtomic: mutationMock.postReceiptAtomic,
}));

describe('usePostPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
    mutationMock.invalidateQueries.mockResolvedValue(undefined);
  });

  it('posts payment via RPC service, then invalidates caches and shows success toast', async () => {
    mutationMock.postReceiptAtomic.mockResolvedValue('ok');
    const { usePostPayment } = await import('./usePayments');

    const mutationOptions = usePostPayment() as unknown as {
      mutationFn: (payload: { invoice_id: string; amount: number; method: 'cash'; date: string; reference: null }) => Promise<string>;
      onSuccess: () => Promise<void>;
    };

    const payload = { invoice_id: 'inv_1', amount: 50, method: 'cash' as const, date: '2026-05-14', reference: null };
    await expect(mutationOptions.mutationFn(payload)).resolves.toBe('ok');
    expect(mutationMock.postReceiptAtomic).toHaveBeenCalledWith(expect.any(Object), payload);

    await mutationOptions.onSuccess();

    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: invoiceKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: receiptKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: financialReportKeys.all });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم تسجيل الدفعة بنجاح');
  });

  it('shows error toast when payment mutation fails', async () => {
    const { usePostPayment } = await import('./usePayments');
    const mutationOptions = usePostPayment() as unknown as { onError: (error: unknown) => void };

    mutationOptions.onError(new Error('Payment exceeds remaining balance'));
    expect(mutationMock.toastError).toHaveBeenCalledWith('Payment exceeds remaining balance');
  });
});
