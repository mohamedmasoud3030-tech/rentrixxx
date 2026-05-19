import type { Contract, Expense, Invoice, Person, Property, Unit } from '@/types/domain';
import { DocumentController } from './documents/DocumentController';

type AppLikeDb = { settings: Record<string, unknown>; contracts: Contract[]; tenants: Person[]; units: Unit[]; properties: Property[] };

type TrialBalanceInput = { lines: Array<{ no: string; name: string; debit: number; credit: number }>; totalDebit: number; totalCredit: number };
type PdfRow = { label: string; amount: number };
const render = (type: string, payload: unknown) => void DocumentController.renderToPDF({ type, payload });
export const exportInvoiceToPdf = (invoice: Invoice, db: AppLikeDb): void => render('invoice', { invoice, db });
export const exportContractToPdf = (contract: Contract, db: AppLikeDb): void => render('contract', { contract, db });
export const exportExpenseToPdf = (expense: Expense, db: AppLikeDb): void => render('expense_voucher', { expense, db });
export const exportTrialBalanceToPdf = (trial: TrialBalanceInput, settings: Record<string, unknown>, endDate: string): void => render('trial_balance', { trial, settings, endDate });
export const exportIncomeStatementToPdf = (pnlData: { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] }, settings: Record<string, unknown>, dateRange: string): void => render('income_statement', { pnlData, settings, dateRange });
export const exportBalanceSheetToPdf = (data: { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number }, settings: Record<string, unknown>, date: string): void => render('balance_sheet', { data, settings, date });
