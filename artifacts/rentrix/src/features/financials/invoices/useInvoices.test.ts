import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { financialReportKeys } from '../reports/useFinancialReports';
import { invoiceKeys, useGenerateInvoices } from './useInvoices';

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

function renderHook<T>(useHook: () => T) {
  let current: T | undefined;

  function HookHarness() {
    current = useHook();
    return null;
  }

  renderToString(createElement(HookHarness));

  return {
    result: {
      get current() {
        return current as T;
      },
    },
  };
}


function setupInvoiceHookTest() {
  mutationMock.useQueryClient.mockReturnValue({ invalidateQueries: mutationMock.invalidateQueries });
  mutationMock.invalidateQueries.mockResolvedValue(undefined);
}

type GenerateInvoicesMutationResult = { onSuccess: (value: number) => Promise<void> };

function runGenerateInvoicesOnSuccess(result: { current: GenerateInvoicesMutationResult }, value: number) {
  return result.current.onSuccess(value);
}

function expectInvoiceInvalidation() {
  const expectedKeys = [invoiceKeys.all, financialReportKeys.all];
  expectedKeys.forEach((queryKey) => {
    expect(mutationMock.invalidateQueries).toHaveBeenCalledWith({ queryKey });
  });
  expect(mutationMock.invalidateQueries).toHaveBeenCalledTimes(expectedKeys.length);
}

describe('useGenerateInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupInvoiceHookTest();
  });

  it('invalidates invoice and financial report queries after successful invoice generation', async () => {
    const { result } = renderHook(
      () => useGenerateInvoices() as unknown as GenerateInvoicesMutationResult,
    );

    await runGenerateInvoicesOnSuccess(result, 2);

    expectInvoiceInvalidation();
    expect(mutationMock.toastSuccess).toHaveBeenCalledWith('تم إنشاء 2 فاتورة');
  });
});
