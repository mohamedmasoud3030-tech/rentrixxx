import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoiceKeys } from '../invoices/useInvoices';
import { receiptKeys } from '../receipts/useReceipts';

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
  postReceiptAtomic: vi.fn(),
}));

describe('usePostPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
    mutationMock.invalidateQueries.mockResolvedValue(undefined);
  });

  it('invalidates invoice and receipt queries after a successful payment post', async () => {
    const { usePostPayment } = await import('./usePayments');

    const mutationOptions = usePostPayment() as unknown as {
      onSuccess: (result: string, variables: { invoice_id: string }) => Promise<void>;
    };
    await mutationOptions.onSuccess('ok', { invoice_id: 'inv_1' });

    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: invoiceKeys.detail('inv_1') });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: receiptKeys.lists() });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم تسجيل الدفعة بنجاح');
  });
});
