import { supabase } from '@/integrations/supabase/client';import {
  getInvoiceTotalsReport as getInvoiceTotalsReportService,
  getPaymentTotalsReport as getPaymentTotalsReportService,
  getExpenseTotalsReport as getExpenseTotalsReportService,
  getOutstandingBalanceReport as getOutstandingBalanceReportService,
  getCollectionSummaryReport as getCollectionSummaryReportService,
  getOverdueInvoicesReport as getOverdueInvoicesReportService,
  getAgedReceivablesReport as getAgedReceivablesReportService,
  getArrearsSummaryReport as getArrearsSummaryReportService,
  getDailyCollectionReport as getDailyCollectionReportService,
  getFinancialPeriodSummaryReport as getFinancialPeriodSummaryReportService,
  getFinancialCashflowReport as getFinancialCashflowReportService,
  getExpenseBreakdownReport as getExpenseBreakdownReportService
} from '@/services/financial/financialReportsService';
import type {
  ArrearsReportFilters,
  ArrearsSummaryReport,
  AgedReceivablesReport,
  CollectionSummaryReport,
  DailyCollectionReport,
  ExpenseBreakdownReport,
  ExpenseBreakdownReportFilters,
  ExpenseTotalsReport,
  FinancialCashflowReport,
  FinancialPeriodSummaryReport,
  FinancialReportFilters,
  InvoiceTotalsReport,
  OutstandingBalanceReport,
  OverdueInvoicesReport,
  PaymentTotalsReport,
} from '@/services/financial/financialReportsService';
export { getAgingBucketKey } from '@/services/financial/financialReportsService';
export type { FinancialReportStatus, FinancialReportFilters, InvoiceTotalsReport, PaymentTotalsReport, ExpenseTotalsReport, OutstandingBalanceReport, CollectionSummaryReport, PaymentMethodTotals, DailyCollectionReportRow, DailyCollectionReport, FinancialPeriodSummaryReport, FinancialCashflowReportRow, FinancialCashflowReport, ExpenseBreakdownReportFilters, ExpenseBreakdownCategoryRow, ExpenseBreakdownPropertyRow, ExpenseBreakdownReport, ArrearsReportFilters, AgingBucketKey, AgedReceivablesBucket, OverdueInvoiceReportRow, AgedReceivablesGroupRow, AgedReceivablesReport, OverdueInvoicesReport, ArrearsSummaryReport } from '@/services/financial/financialReportsService';
export async function getInvoiceTotalsReport(filters: FinancialReportFilters): Promise<InvoiceTotalsReport> {
  return getInvoiceTotalsReportService(supabase, filters);
}
export async function getPaymentTotalsReport(filters: FinancialReportFilters): Promise<PaymentTotalsReport> {
  return getPaymentTotalsReportService(supabase, filters);
}
export async function getExpenseTotalsReport(filters: FinancialReportFilters): Promise<ExpenseTotalsReport> {
  return getExpenseTotalsReportService(supabase, filters);
}
export async function getOutstandingBalanceReport(filters: FinancialReportFilters): Promise<OutstandingBalanceReport> {
  return getOutstandingBalanceReportService(supabase, filters);
}
export async function getCollectionSummaryReport(filters: FinancialReportFilters): Promise<CollectionSummaryReport> {
  return getCollectionSummaryReportService(supabase, filters);
}
export async function getOverdueInvoicesReport(filters: ArrearsReportFilters): Promise<OverdueInvoicesReport> {
  return getOverdueInvoicesReportService(supabase, filters);
}
export async function getAgedReceivablesReport(filters: ArrearsReportFilters): Promise<AgedReceivablesReport> {
  return getAgedReceivablesReportService(supabase, filters);
}
export async function getArrearsSummaryReport(filters: ArrearsReportFilters): Promise<ArrearsSummaryReport> {
  return getArrearsSummaryReportService(supabase, filters);
}
export async function getDailyCollectionReport(filters: FinancialReportFilters): Promise<DailyCollectionReport> {
  return getDailyCollectionReportService(supabase, filters);
}
export async function getFinancialPeriodSummaryReport(filters: FinancialReportFilters): Promise<FinancialPeriodSummaryReport> {
  return getFinancialPeriodSummaryReportService(supabase, filters);
}
export async function getFinancialCashflowReport(filters: FinancialReportFilters): Promise<FinancialCashflowReport> {
  return getFinancialCashflowReportService(supabase, filters);
}
export async function getExpenseBreakdownReport(filters: ExpenseBreakdownReportFilters): Promise<ExpenseBreakdownReport> {
  return getExpenseBreakdownReportService(supabase, filters);
}
