import { jsPDF } from 'jspdf';
import type { Contract, Database, Expense, Invoice, Settings } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';

type PdfRow = { label: string; amount: number };

type AppLikeDb = Pick<Database, 'settings' | 'contracts' | 'tenants' | 'units' | 'properties'>;

type TrialBalanceInput = {
  lines: Array<{ no: string; name: string; debit: number; credit: number }>;
  totalDebit: number;
  totalCredit: number;
};

const PAGE_MARGIN_X = 14;
const PAGE_MARGIN_Y = 18;
const LINE_HEIGHT = 7;

const createDoc = (): jsPDF => new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

const saveDoc = (doc: jsPDF, filename: string): void => {
  doc.save(`${filename}.pdf`);
};

const writeHeader = (doc: jsPDF, title: string, subtitle?: string): number => {
  let y = PAGE_MARGIN_Y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, PAGE_MARGIN_X, y);
  y += LINE_HEIGHT;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
  }
  return y + 1;
};

const writeKeyValue = (doc: jsPDF, y: number, key: string, value: string): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${key}:`, PAGE_MARGIN_X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value, PAGE_MARGIN_X + 45, y);
  return y + LINE_HEIGHT;
};

const safeCurrency = (value: number | undefined, settings?: Settings): string => {
  const currency = settings?.operational?.currency;
  return formatCurrency(Number.isFinite(value) ? (value as number) : 0, currency);
};

export const exportInvoiceToPdf = (invoice: Invoice, db: AppLikeDb): void => {
  const doc = createDoc();
  const contract = db.contracts.find((c) => c.id === invoice.contractId);
  const tenant = contract ? db.tenants.find((t) => t.id === contract.tenantId) : null;
  const unit = contract ? db.units.find((u) => u.id === contract.unitId) : null;
  const property = unit ? db.properties.find((p) => p.id === unit.propertyId) : null;
  const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
  const remaining = Math.max(0, total - (invoice.paidAmount || 0));

  let y = writeHeader(doc, `Invoice #${invoice.no}`, `Due: ${formatDate(invoice.dueDate)}`);
  y = writeKeyValue(doc, y, 'Tenant', tenant?.name || '-');
  y = writeKeyValue(doc, y, 'Property / Unit', `${property?.name || '-'} / ${unit?.name || '-'}`);
  y = writeKeyValue(doc, y, 'Type', invoice.type || '-');
  y = writeKeyValue(doc, y, 'Status', invoice.status || '-');
  y = writeKeyValue(doc, y, 'Amount', safeCurrency(invoice.amount, db.settings));
  y = writeKeyValue(doc, y, 'Tax', safeCurrency(invoice.taxAmount || 0, db.settings));
  y = writeKeyValue(doc, y, 'Total', safeCurrency(total, db.settings));
  y = writeKeyValue(doc, y, 'Paid', safeCurrency(invoice.paidAmount || 0, db.settings));
  y = writeKeyValue(doc, y, 'Remaining', safeCurrency(remaining, db.settings));

  if (invoice.notes?.trim()) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(invoice.notes, 180);
    doc.text(wrapped, PAGE_MARGIN_X, y);
  }

  saveDoc(doc, `invoice_${invoice.no || invoice.id}`);
};

export const exportContractToPdf = (contract: Contract, db: AppLikeDb): void => {
  const doc = createDoc();
  const tenant = db.tenants.find((t) => t.id === contract.tenantId);
  const unit = db.units.find((u) => u.id === contract.unitId);
  const property = unit ? db.properties.find((p) => p.id === unit.propertyId) : null;

  let y = writeHeader(doc, `Contract #${contract.no || contract.id}`, `Period: ${formatDate(contract.start)} - ${formatDate(contract.end)}`);
  y = writeKeyValue(doc, y, 'Tenant', tenant?.name || '-');
  y = writeKeyValue(doc, y, 'Property / Unit', `${property?.name || '-'} / ${unit?.name || '-'}`);
  y = writeKeyValue(doc, y, 'Status', contract.status || '-');
  y = writeKeyValue(doc, y, 'Rent', safeCurrency(contract.rent, db.settings));
  y = writeKeyValue(doc, y, 'Deposit', safeCurrency(contract.deposit, db.settings));
  y = writeKeyValue(doc, y, 'Due Day', String(contract.dueDay || '-'));

  if (contract.sponsorName || contract.sponsorId || contract.sponsorPhone) {
    y += 2;
    y = writeKeyValue(doc, y, 'Sponsor', contract.sponsorName || '-');
    y = writeKeyValue(doc, y, 'Sponsor ID', contract.sponsorId || '-');
    y = writeKeyValue(doc, y, 'Sponsor Phone', contract.sponsorPhone || '-');
  }

  saveDoc(doc, `contract_${contract.no || contract.id}`);
};

export const exportExpenseToPdf = (expense: Expense, db: AppLikeDb): void => {
  const doc = createDoc();
  const contract = expense.contractId ? db.contracts.find((c) => c.id === expense.contractId) : null;
  const tenant = contract ? db.tenants.find((t) => t.id === contract.tenantId) : null;
  const unit = contract ? db.units.find((u) => u.id === contract.unitId) : null;

  let y = writeHeader(doc, `Expense #${expense.no || expense.id}`, `Date: ${formatDateTime(expense.dateTime)}`);
  y = writeKeyValue(doc, y, 'Category', expense.category || '-');
  y = writeKeyValue(doc, y, 'Status', expense.status || '-');
  y = writeKeyValue(doc, y, 'Amount', safeCurrency(expense.amount || 0, db.settings));
  y = writeKeyValue(doc, y, 'Tax', safeCurrency(expense.taxAmount || 0, db.settings));
  y = writeKeyValue(doc, y, 'Reference', expense.ref || '-');
  y = writeKeyValue(doc, y, 'Charged To', expense.chargedTo || '-');
  y = writeKeyValue(doc, y, 'Contract', contract?.no || '-');
  y = writeKeyValue(doc, y, 'Tenant / Unit', `${tenant?.name || '-'} / ${unit?.name || '-'}`);

  if (expense.notes?.trim()) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(expense.notes, 180);
    doc.text(wrapped, PAGE_MARGIN_X, y);
  }

  saveDoc(doc, `expense_${expense.no || expense.id}`);
};

export const exportTrialBalanceToPdf = (trial: TrialBalanceInput, settings: Settings, endDate: string): void => {
  const doc = createDoc();
  let y = writeHeader(doc, 'Trial Balance', `As of ${formatDate(endDate)}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('No', PAGE_MARGIN_X, y);
  doc.text('Account', PAGE_MARGIN_X + 20, y);
  doc.text('Debit', PAGE_MARGIN_X + 110, y);
  doc.text('Credit', PAGE_MARGIN_X + 150, y);
  y += LINE_HEIGHT;

  doc.setFont('helvetica', 'normal');
  for (const line of trial.lines) {
    if (y > 280) {
      doc.addPage();
      y = PAGE_MARGIN_Y;
    }
    doc.text(String(line.no || '-'), PAGE_MARGIN_X, y);
    doc.text(String(line.name || '-'), PAGE_MARGIN_X + 20, y);
    doc.text(safeCurrency(line.debit || 0, settings), PAGE_MARGIN_X + 110, y);
    doc.text(safeCurrency(line.credit || 0, settings), PAGE_MARGIN_X + 150, y);
    y += LINE_HEIGHT;
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Debit: ${safeCurrency(trial.totalDebit || 0, settings)}`, PAGE_MARGIN_X, y);
  y += LINE_HEIGHT;
  doc.text(`Total Credit: ${safeCurrency(trial.totalCredit || 0, settings)}`, PAGE_MARGIN_X, y);

  saveDoc(doc, `trial_balance_${endDate}`);
};

export const exportIncomeStatementToPdf = (
  pnlData: { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] },
  settings: Settings,
  dateRange: string,
): void => {
  const doc = createDoc();
  let y = writeHeader(doc, 'Income Statement', dateRange);

  y = writeKeyValue(doc, y, 'Total Revenue', safeCurrency(pnlData.totalRevenue, settings));
  y = writeKeyValue(doc, y, 'Total Expense', safeCurrency(pnlData.totalExpense, settings));
  y = writeKeyValue(doc, y, 'Net Income', safeCurrency(pnlData.netIncome, settings));

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Breakdown', PAGE_MARGIN_X, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  for (const row of pnlData.revenues) {
    doc.text(`${row.label}: ${safeCurrency(row.amount, settings)}`, PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Breakdown', PAGE_MARGIN_X, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  for (const row of pnlData.expenses) {
    if (y > 280) {
      doc.addPage();
      y = PAGE_MARGIN_Y;
    }
    doc.text(`${row.label}: ${safeCurrency(row.amount, settings)}`, PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
  }

  saveDoc(doc, `income_statement_${dateRange.replace(/\s+/g, '_')}`);
};

export const exportBalanceSheetToPdf = (
  data: { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number },
  settings: Settings,
  date: string,
): void => {
  const doc = createDoc();
  let y = writeHeader(doc, 'Balance Sheet', formatDate(date));

  y = writeKeyValue(doc, y, 'Total Assets', safeCurrency(data.totalAssets, settings));
  y = writeKeyValue(doc, y, 'Total Liabilities', safeCurrency(data.totalLiabilities, settings));
  y = writeKeyValue(doc, y, 'Total Equity', safeCurrency(data.totalEquity, settings));

  const writeSection = (title: string, rows: PdfRow[]): void => {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(title, PAGE_MARGIN_X, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    for (const row of rows) {
      if (y > 280) {
        doc.addPage();
        y = PAGE_MARGIN_Y;
      }
      doc.text(`${row.label}: ${safeCurrency(row.amount, settings)}`, PAGE_MARGIN_X, y);
      y += LINE_HEIGHT;
    }
  };

  writeSection('Assets', data.assets);
  writeSection('Liabilities', data.liabilities);
  writeSection('Equity', data.equity);

  saveDoc(doc, `balance_sheet_${date}`);
};
