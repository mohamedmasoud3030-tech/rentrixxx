import { useQuery } from '@tanstack/react-query';
import {
  getCollectionSummaryReport,
  getExpenseTotalsReport,
  getInvoiceTotalsReport,
  getOutstandingBalanceReport,
  getPaymentTotalsReport,
  type FinancialReportFilters,
} from './financialReportsService';

export const financialReportKeys = {
  all: ['financialReports'] as const,
  collectionSummary: (filters: FinancialReportFilters) => [...financialReportKeys.all, 'collectionSummary', filters] as const,
  invoiceTotals: (filters: FinancialReportFilters) => [...financialReportKeys.all, 'invoiceTotals', filters] as const,
  paymentTotals: (filters: FinancialReportFilters) => [...financialReportKeys.all, 'paymentTotals', filters] as const,
  expenseTotals: (filters: FinancialReportFilters) => [...financialReportKeys.all, 'expenseTotals', filters] as const,
  outstandingBalance: (filters: FinancialReportFilters) => [...financialReportKeys.all, 'outstandingBalance', filters] as const,
};

function hasRequiredDateRange(filters: FinancialReportFilters) {
  return Boolean(filters.dateFrom && filters.dateTo);
}

export function useCollectionSummaryReport(filters: FinancialReportFilters) {
  return useQuery({
    queryKey: financialReportKeys.collectionSummary(filters),
    queryFn: () => getCollectionSummaryReport(filters),
    enabled: hasRequiredDateRange(filters),
  });
}

export function useInvoiceTotalsReport(filters: FinancialReportFilters) {
  return useQuery({
    queryKey: financialReportKeys.invoiceTotals(filters),
    queryFn: () => getInvoiceTotalsReport(filters),
    enabled: hasRequiredDateRange(filters),
  });
}

export function usePaymentTotalsReport(filters: FinancialReportFilters) {
  return useQuery({
    queryKey: financialReportKeys.paymentTotals(filters),
    queryFn: () => getPaymentTotalsReport(filters),
    enabled: hasRequiredDateRange(filters),
  });
}

export function useExpenseTotalsReport(filters: FinancialReportFilters) {
  return useQuery({
    queryKey: financialReportKeys.expenseTotals(filters),
    queryFn: () => getExpenseTotalsReport(filters),
    enabled: hasRequiredDateRange(filters),
  });
}

export function useOutstandingBalanceReport(filters: FinancialReportFilters) {
  return useQuery({
    queryKey: financialReportKeys.outstandingBalance(filters),
    queryFn: () => getOutstandingBalanceReport(filters),
    enabled: hasRequiredDateRange(filters),
  });
}
