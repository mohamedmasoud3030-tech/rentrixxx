import type { Contract, Database, Expense, Invoice, Settings } from '../types';
import { DocumentController } from './documents/DocumentController';

type AppLikeDb = Pick<Database, 'settings' | 'contracts' | 'tenants' | 'units' | 'properties'>;

type TrialBalanceInput = {
  lines: Array<{ no: string; name: string; debit: number; credit: number }>;
  totalDebit: number;
  totalCredit: number;
};

type PdfRow = { label: string; amount: number };

export const exportInvoiceToPdf = (invoice: Invoice, db: AppLikeDb): void => {
  void DocumentController.renderToPDF({
    type: 'invoice',
    payload: { invoice, db },
  });
};

export const exportContractToPdf = (contract: Contract, db: AppLikeDb): void => {
  void DocumentController.renderToPDF({
    type: 'contract',
    payload: { contract, db },
  });
};

export const exportExpenseToPdf = (expense: Expense, db: AppLikeDb): void => {
  void DocumentController.renderToPDF({
    type: 'expense_voucher',
    payload: { expense, db },
  });
};

export const exportTrialBalanceToPdf = (trial: TrialBalanceInput, settings: Settings, endDate: string): void => {
  void DocumentController.renderToPDF({
    type: 'trial_balance',
    payload: { trial, settings, endDate },
  });
};

export const exportIncomeStatementToPdf = (
  pnlData: { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] },
  settings: Settings,
  dateRange: string,
): void => {
  void DocumentController.renderToPDF({
    type: 'income_statement',
    payload: { pnlData, settings, dateRange },
  });
};

export const exportBalanceSheetToPdf = (
  data: { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number },
  settings: Settings,
  date: string,
): void => {
  void DocumentController.renderToPDF({
    type: 'balance_sheet',
    payload: { data, settings, date },
  });
};
