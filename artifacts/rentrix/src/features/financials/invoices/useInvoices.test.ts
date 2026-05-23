import { beforeEach, describe, expect, it, vi } from 'vitest';
import { financialReportKeys } from '../reports/useFinancialReports';
import { invoiceKeys } from './useInvoices';

const mutationMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn((options) => options),
  useQuery: vi.fn((options) => options),
  useQueryClient: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mutationMock.useMutation,
  useQuery: mutationMock.useQuery,
  useQueryClient: mutationMock.useQueryClient,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mutationMock.toastSuccess,
    error: mutationMock.toastError,
  },
}));

vi.mock('./invoiceService', () => ({
  generateInvoicesFromActiveContracts: vi.fn(),
  getInvoiceDetail: vi.fn(),
  listInvoices: vi.fn(),
}));

describe('useGenerateInvoices', () => {
  function setupInvoiceHookTest() {
    mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
    mutationMock.invalidateQueries.mockResolvedValue(undefined);
  }

  async function runGenerateInvoicesOnSuccess(count: number) {
    const { useGenerateInvoices } = await import('./useInvoices');
    const mutationOptions = useGenerateInvoices() as unknown as { onSuccess: (value: number) => Promise<void> };
    await mutationOptions.onSuccess(count);
  }

  function expectInvoiceInvalidation() {
    const expectedKeys = [invoiceKeys.all, financialReportKeys.all];
    expectedKeys.forEach((queryKey) => {
      expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey });
    });
    expect(mutationMock.invalidateQueries).toHaveBeenCalledTimes(expectedKeys.length);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupInvoiceHookTest();
  });

  it('invalidates invoice and financial report queries after successful invoice generation', async () => {
    await runGenerateInvoicesOnSuccess(2);
    expectInvoiceInvalidation();
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم إنشاء 2 فاتورة');
  });
});
