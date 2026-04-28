import { formatCurrency, formatDate, formatDateTime } from '@/utils/helpers';
import type { Contract, Database, Expense, Invoice, Settings } from '@/types';
import { TableGenerator } from './TableGenerator';
import type { DocumentRequest, UnifiedDocumentModel } from './types';

type AppLikeDb = Pick<Database, 'settings' | 'contracts' | 'tenants' | 'units' | 'properties'>;

const currencyOf = (settings?: Settings): Settings['operational']['currency'] => settings?.operational?.currency || 'OMR';

const toMoney = (value: number, settings?: Settings): string => formatCurrency(Number.isFinite(value) ? value : 0, currencyOf(settings));

const baseHeader = (settings: Settings, title: string, dateValue?: string, documentNo?: string) => ({
  companyName: settings.general?.company?.name || 'Rentrix',
  companyAddress: settings.general?.company?.address,
  companyPhone: settings.general?.company?.phone,
  title,
  documentNo,
  dateLabel: 'Date',
  dateValue,
  currency: currencyOf(settings),
});

class DocumentEngine {
  build(request: DocumentRequest): UnifiedDocumentModel {
    switch (request.type) {
      case 'invoice': return this.buildInvoice(request.payload as { invoice: Invoice; db: AppLikeDb });
      case 'contract': return this.buildContract(request.payload as { contract: Contract; db: AppLikeDb });
      case 'expense_voucher':
      case 'payment': return this.buildExpense(request.payload as { expense: Expense; db: AppLikeDb });
      case 'trial_balance': return this.buildTrialBalance(request.payload as { trial: any; settings: Settings; endDate: string });
      case 'income_statement': return this.buildIncomeStatement(request.payload as { pnlData: any; settings: Settings; dateRange: string });
      case 'balance_sheet': return this.buildBalanceSheet(request.payload as { data: any; settings: Settings; date: string });
      default:
        throw new Error(`Unsupported document type: ${request.type}`);
    }
  }

  private buildInvoice({ invoice, db }: { invoice: Invoice; db: AppLikeDb }): UnifiedDocumentModel {
    const contract = db.contracts.find((c) => c.id === invoice.contractId);
    const tenant = contract ? db.tenants.find((t) => t.id === contract.tenantId) : null;
    const unit = contract ? db.units.find((u) => u.id === contract.unitId) : null;
    const property = unit ? db.properties.find((p) => p.id === unit.propertyId) : null;
    const total = (invoice.amount || 0) + (invoice.taxAmount || 0);
    const remaining = Math.max(0, total - (invoice.paidAmount || 0));

    return {
      type: 'invoice',
      header: baseHeader(db.settings, 'Invoice', formatDate(invoice.dueDate), invoice.no),
      kpis: [
        { label: 'Tenant', value: tenant?.name || '-' },
        { label: 'Unit', value: `${property?.name || '-'} / ${unit?.name || '-'}` },
        { label: 'Status', value: invoice.status || '-' },
      ],
      tables: [
        TableGenerator.build(
          ['Description', 'Amount'],
          [
            ['Amount', toMoney(invoice.amount || 0, db.settings)],
            ['Tax', toMoney(invoice.taxAmount || 0, db.settings)],
            ['Paid', toMoney(invoice.paidAmount || 0, db.settings)],
            ['Remaining', toMoney(remaining, db.settings)],
          ],
          ['Total', toMoney(total, db.settings)],
        ),
      ],
      footer: { signatures: ['tenant', 'accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `invoice_${invoice.no || invoice.id}`,
    };
  }

  private buildContract({ contract, db }: { contract: Contract; db: AppLikeDb }): UnifiedDocumentModel {
    const tenant = db.tenants.find((t) => t.id === contract.tenantId);
    const unit = db.units.find((u) => u.id === contract.unitId);
    const property = unit ? db.properties.find((p) => p.id === unit.propertyId) : null;
    return {
      type: 'contract',
      header: baseHeader(db.settings, 'Contract', formatDate(contract.start), contract.no),
      kpis: [
        { label: 'Tenant', value: tenant?.name || '-' },
        { label: 'Unit', value: `${property?.name || '-'} / ${unit?.name || '-'}` },
        { label: 'Status', value: contract.status || '-' },
      ],
      tables: [
        TableGenerator.build(
          ['Field', 'Value'],
          [
            ['Start', formatDate(contract.start)],
            ['End', formatDate(contract.end)],
            ['Rent', toMoney(contract.rent || 0, db.settings)],
            ['Deposit', toMoney(contract.deposit || 0, db.settings)],
            ['Due Day', String(contract.dueDay || '-')],
          ],
        ),
      ],
      footer: { signatures: ['owner', 'tenant', 'accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `contract_${contract.no || contract.id}`,
    };
  }

  private buildExpense({ expense, db }: { expense: Expense; db: AppLikeDb }): UnifiedDocumentModel {
    return {
      type: 'expense_voucher',
      header: baseHeader(db.settings, 'Expense Voucher', formatDateTime(expense.dateTime), expense.no),
      kpis: [
        { label: 'Category', value: expense.category || '-' },
        { label: 'Status', value: expense.status || '-' },
        { label: 'Charged To', value: expense.chargedTo || '-' },
      ],
      tables: [
        TableGenerator.build(
          ['Field', 'Value'],
          [
            ['Amount', toMoney(expense.amount || 0, db.settings)],
            ['Tax', toMoney(expense.taxAmount || 0, db.settings)],
            ['Reference', expense.ref || '-'],
            ['Notes', expense.notes || '-'],
          ],
        ),
      ],
      footer: { signatures: ['accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `expense_${expense.no || expense.id}`,
    };
  }

  private buildTrialBalance({ trial, settings, endDate }: { trial: any; settings: Settings; endDate: string }): UnifiedDocumentModel {
    return {
      type: 'trial_balance',
      header: baseHeader(settings, 'Trial Balance', formatDate(endDate)),
      kpis: [
        { label: 'Total Debit', value: toMoney(trial.totalDebit || 0, settings) },
        { label: 'Total Credit', value: toMoney(trial.totalCredit || 0, settings) },
      ],
      tables: [
        TableGenerator.build(
          ['No', 'Account', 'Debit', 'Credit'],
          (trial.lines || []).map((line: any) => [line.no, line.name, toMoney(line.debit || 0, settings), toMoney(line.credit || 0, settings)]),
          ['Totals', '', toMoney(trial.totalDebit || 0, settings), toMoney(trial.totalCredit || 0, settings)],
        ),
      ],
      footer: { signatures: ['accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `trial_balance_${endDate}`,
    };
  }

  private buildIncomeStatement({ pnlData, settings, dateRange }: { pnlData: any; settings: Settings; dateRange: string }): UnifiedDocumentModel {
    return {
      type: 'income_statement',
      header: baseHeader(settings, 'Income Statement', dateRange),
      kpis: [
        { label: 'Total Revenue', value: toMoney(pnlData.totalRevenue || 0, settings) },
        { label: 'Total Expense', value: toMoney(pnlData.totalExpense || 0, settings) },
        { label: 'Net Income', value: toMoney(pnlData.netIncome || 0, settings) },
      ],
      tables: [
        TableGenerator.build(
          ['Revenue', 'Amount'],
          (pnlData.revenues || []).map((r: any) => [r.label, toMoney(r.amount || 0, settings)]),
        ),
        TableGenerator.build(
          ['Expense', 'Amount'],
          (pnlData.expenses || []).map((r: any) => [r.label, toMoney(r.amount || 0, settings)]),
        ),
      ],
      footer: { signatures: ['accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `income_statement_${dateRange.replace(/\s+/g, '_')}`,
    };
  }

  private buildBalanceSheet({ data, settings, date }: { data: any; settings: Settings; date: string }): UnifiedDocumentModel {
    return {
      type: 'balance_sheet',
      header: baseHeader(settings, 'Balance Sheet', formatDate(date)),
      kpis: [
        { label: 'Total Assets', value: toMoney(data.totalAssets || 0, settings) },
        { label: 'Total Liabilities', value: toMoney(data.totalLiabilities || 0, settings) },
        { label: 'Total Equity', value: toMoney(data.totalEquity || 0, settings) },
      ],
      tables: [
        TableGenerator.build(['Assets', 'Amount'], (data.assets || []).map((a: any) => [a.label, toMoney(a.amount || 0, settings)])),
        TableGenerator.build(['Liabilities', 'Amount'], (data.liabilities || []).map((a: any) => [a.label, toMoney(a.amount || 0, settings)])),
        TableGenerator.build(['Equity', 'Amount'], (data.equity || []).map((a: any) => [a.label, toMoney(a.amount || 0, settings)])),
      ],
      footer: { signatures: ['accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `balance_sheet_${date}`,
    };
  }
}

export const documentEngine = new DocumentEngine();
