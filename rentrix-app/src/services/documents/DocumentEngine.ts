import type { Contract, Expense, Invoice, Person, Property, Receipt, Unit } from '@/types/domain';
import { TableGenerator } from './TableGenerator';
import type { DocumentRequest, SignatureRole, UnifiedDocumentModel } from './types';

type Settings = { general?: { company?: { name?: string; address?: string; phone?: string } }; operational?: { currency?: string } };
type AppLikeDb = { settings: Settings; contracts: Contract[]; tenants: Person[]; units: Unit[]; properties: Property[]; receipts?: Receipt[] };
type TrialBalanceInput = { lines: Array<{ no: string; name: string; debit: number; credit: number }>; totalDebit: number; totalCredit: number };
type PdfRow = { label: string; amount: number };
type IncomeStatementInput = { totalRevenue: number; totalExpense: number; netIncome: number; revenues: PdfRow[]; expenses: PdfRow[] };
type BalanceSheetInput = { assets: PdfRow[]; liabilities: PdfRow[]; equity: PdfRow[]; totalAssets: number; totalLiabilities: number; totalEquity: number };

type TrialBalancePayload = { trial: TrialBalanceInput; settings: Settings; endDate: string };
type IncomeStatementPayload = { pnlData: IncomeStatementInput; settings: Settings; dateRange: string };
type BalanceSheetPayload = { data: BalanceSheetInput; settings: Settings; date: string };

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');
const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB') : '-');
const currencyOf = (s?: Settings) => s?.operational?.currency || 'OMR';
const toMoney = (value: number, s?: Settings) => `${Number.isFinite(value) ? value.toFixed(3) : '0.000'} ${currencyOf(s)}`;

const baseHeader = (s: Settings, title: string, dateValue?: string, documentNo?: string) => ({
  companyName: s.general?.company?.name || 'Rentrix',
  companyAddress: s.general?.company?.address,
  companyPhone: s.general?.company?.phone,
  title,
  documentNo,
  dateLabel: 'التاريخ',
  dateValue,
  currency: currencyOf(s),
});

const formatDocumentValue = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '—' : value.toISOString();
  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return '—';
};

const kpi = (label: string, value: unknown) => ({ label, value: formatDocumentValue(value) });
const footer = (signatures: SignatureRole[]) => ({ signatures, companyStampLabel: 'ختم الشركة' });
const fileName = (prefix: string, id: string | null, fallback: string) => `${prefix}_${id || fallback}`;

const resolveContractContext = (db: AppLikeDb, contractId: string | null) => {
  const contract = db.contracts.find((c) => c.id === contractId);
  const tenant = contract ? db.tenants.find((t) => t.id === contract.tenant_id) : null;
  const unit = contract ? db.units.find((u) => u.id === contract.unit_id) : null;
  const property = unit ? db.properties.find((p) => p.id === unit.property_id) : null;
  return { contract, tenant, unit, property };
};

class DocumentEngine {
  build(request: DocumentRequest): UnifiedDocumentModel {
    switch (request.type) {
      case 'invoice':
        return this.buildInvoice(request.payload as { invoice: Invoice; db: AppLikeDb });
      case 'contract':
        return this.buildContract(request.payload as { contract: Contract; db: AppLikeDb });
      case 'receipt':
        return this.buildReceipt(request.payload as { receipt: Receipt; db: AppLikeDb });
      case 'expense_voucher':
      case 'payment':
        return this.buildExpense(request.payload as { expense: Expense; db: AppLikeDb });
      case 'trial_balance':
        return this.buildTrialBalance(request.payload as TrialBalancePayload);
      case 'income_statement':
        return this.buildIncomeStatement(request.payload as IncomeStatementPayload);
      case 'balance_sheet':
        return this.buildBalanceSheet(request.payload as BalanceSheetPayload);
      default:
        throw new Error(`Unsupported document type: ${request.type}`);
    }
  }

  private buildInvoice({ invoice, db }: { invoice: Invoice; db: AppLikeDb }): UnifiedDocumentModel {
    const { tenant, unit, property } = resolveContractContext(db, invoice.contract_id);
    const total = invoice.amount || 0;
    const paid = invoice.paid_amount || 0;
    const remaining = Math.max(0, total - paid);

    return {
      type: 'invoice',
      header: baseHeader(db.settings, 'فاتورة', fmtDate(invoice.due_date), invoice.id.slice(0, 8)),
      kpis: [
        kpi('المستأجر', tenant?.full_name),
        kpi('الوحدة', `${property?.title || '-'} / ${unit?.unit_number || '-'}`),
        kpi('الحالة', invoice.status),
      ],
      tables: [
        TableGenerator.build(
          ['الوصف', 'المبلغ'],
          [
            ['قيمة الفاتورة', toMoney(invoice.amount || 0, db.settings)],
            ['الضريبة', toMoney(0, db.settings)],
            ['المدفوع', toMoney(paid, db.settings)],
            ['المتبقي', toMoney(remaining, db.settings)],
          ],
          ['الإجمالي', toMoney(total, db.settings)],
        ),
      ],
      footer: footer(['tenant', 'accountant', 'general_manager']),
      fileName: fileName('invoice', invoice.id.slice(0, 8), invoice.id),
    };
  }

  private buildContract({ contract, db }: { contract: Contract; db: AppLikeDb }): UnifiedDocumentModel {
    const tenant = db.tenants.find((t) => t.id === contract.tenant_id);
    const unit = db.units.find((u) => u.id === contract.unit_id);
    const property = unit ? db.properties.find((p) => p.id === unit.property_id) : null;

    return {
      type: 'contract',
      header: baseHeader(db.settings, 'عقد إيجار', fmtDate(contract.start_date), contract.id.slice(0, 8)),
      kpis: [
        kpi('المستأجر', tenant?.full_name),
        kpi('الوحدة', `${property?.title || '-'} / ${unit?.unit_number || '-'}`),
        kpi('الحالة', contract.status),
      ],
      tables: [
        TableGenerator.build(
          ['الحقل', 'القيمة'],
          [
            ['تاريخ البداية', fmtDate(contract.start_date)],
            ['تاريخ النهاية', fmtDate(contract.end_date)],
            ['قيمة الإيجار', toMoney(contract.rent_amount || 0, db.settings)],
            ['التأمين', toMoney(0, db.settings)],
            ['دورة السداد', String(contract.payment_cycle || '-')],
          ],
        ),
      ],
      footer: footer(['owner', 'tenant', 'accountant', 'general_manager']),
      fileName: fileName('contract', contract.id.slice(0, 8), contract.id),
    };
  }

  private buildReceipt({ receipt, db }: { receipt: Receipt; db: AppLikeDb }): UnifiedDocumentModel {
    const invoice = receipt.invoices?.[0];
    const { tenant, unit, property } = invoice ? resolveContractContext(db, invoice.contract_id) : { tenant: undefined, unit: undefined, property: undefined };

    return {
      type: 'receipt',
      header: baseHeader(db.settings, 'إيصال استقبال', fmtDate(receipt.payment_date), receipt.id.slice(0, 8)),
      kpis: [
        kpi('المستأجر', tenant?.full_name || 'N/A'),
        kpi('الوحدة', property ? `${property.title} / ${unit?.unit_number || '-'}` : 'N/A'),
        kpi('طريقة الدفع', receipt.payment_method),
      ],
      tables: [
        TableGenerator.build(
          ['الحقل', 'القيمة'],
          [
            ['المبلغ المستقبل', toMoney(receipt.amount || 0, db.settings)],
            ['طريقة الدفع', receipt.payment_method],
            ['رقم المرجع', receipt.reference_number || '-'],
            ['الملاحظات', receipt.notes || '-'],
          ],
          ['الإجمالي', toMoney(receipt.amount || 0, db.settings)],
        ),
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('receipt', receipt.id.slice(0, 8), receipt.id),
    };
  }

  private buildExpense({ expense, db }: { expense: Expense; db: AppLikeDb }): UnifiedDocumentModel {
    const property = db.properties.find((p) => p.id === expense.property_id);

    return {
      type: 'expense_voucher',
      header: baseHeader(db.settings, 'سند مصروف', fmtDateTime(expense.expense_date), expense.id.slice(0, 8)),
      kpis: [
        kpi('التصنيف', expense.category),
        kpi('العقار', property?.title),
        kpi('الحالة', '-'),
      ],
      tables: [
        TableGenerator.build(
          ['الحقل', 'القيمة'],
          [
            ['المبلغ', toMoney(expense.amount || 0, db.settings)],
            ['الضريبة', toMoney(0, db.settings)],
            ['المرجع', '-'],
            ['الملاحظات', expense.description || '-'],
          ],
        ),
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('expense', expense.id.slice(0, 8), expense.id),
    };
  }

  private buildTrialBalance({ trial, settings, endDate }: TrialBalancePayload): UnifiedDocumentModel {
    return {
      type: 'trial_balance',
      header: baseHeader(settings, 'ميزان المراجعة', fmtDate(endDate)),
      kpis: [
        kpi('إجمالي المدين', toMoney(trial.totalDebit, settings)),
        kpi('إجمالي الدائن', toMoney(trial.totalCredit, settings)),
      ],
      tables: [
        TableGenerator.build(
          ['رقم الحساب', 'اسم الحساب', 'مدين', 'دائن'],
          trial.lines.map((line) => [line.no, line.name, toMoney(line.debit, settings), toMoney(line.credit, settings)]),
          ['الإجمالي', '', toMoney(trial.totalDebit, settings), toMoney(trial.totalCredit, settings)],
        ),
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('trial-balance', endDate, 'report'),
    };
  }

  private buildIncomeStatement({ pnlData, settings, dateRange }: IncomeStatementPayload): UnifiedDocumentModel {
    return {
      type: 'income_statement',
      header: baseHeader(settings, 'قائمة الدخل', dateRange),
      kpis: [
        kpi('إجمالي الإيرادات', toMoney(pnlData.totalRevenue, settings)),
        kpi('إجمالي المصروفات', toMoney(pnlData.totalExpense, settings)),
        kpi('صافي الدخل', toMoney(pnlData.netIncome, settings)),
      ],
      tables: [
        {
          ...TableGenerator.build(
            ['البند', 'المبلغ'],
            pnlData.revenues.map((row) => [row.label, toMoney(row.amount, settings)]),
            ['إجمالي الإيرادات', toMoney(pnlData.totalRevenue, settings)],
          ),
          title: 'الإيرادات',
        },
        {
          ...TableGenerator.build(
            ['البند', 'المبلغ'],
            pnlData.expenses.map((row) => [row.label, toMoney(row.amount, settings)]),
            ['إجمالي المصروفات', toMoney(pnlData.totalExpense, settings)],
          ),
          title: 'المصروفات',
        },
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('income-statement', dateRange, 'report'),
    };
  }

  private buildBalanceSheet({ data, settings, date }: BalanceSheetPayload): UnifiedDocumentModel {
    const buildSection = (title: string, rows: PdfRow[], totalLabel: string, total: number) => ({
      ...TableGenerator.build(
        ['البند', 'المبلغ'],
        rows.map((row) => [row.label, toMoney(row.amount, settings)]),
        [totalLabel, toMoney(total, settings)],
      ),
      title,
    });

    return {
      type: 'balance_sheet',
      header: baseHeader(settings, 'الميزانية العمومية', fmtDate(date)),
      kpis: [
        kpi('إجمالي الأصول', toMoney(data.totalAssets, settings)),
        kpi('إجمالي الالتزامات', toMoney(data.totalLiabilities, settings)),
        kpi('إجمالي حقوق الملكية', toMoney(data.totalEquity, settings)),
      ],
      tables: [
        buildSection('الأصول', data.assets, 'إجمالي الأصول', data.totalAssets),
        buildSection('الالتزامات', data.liabilities, 'إجمالي الالتزامات', data.totalLiabilities),
        buildSection('حقوق الملكية', data.equity, 'إجمالي حقوق الملكية', data.totalEquity),
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('balance-sheet', date, 'report'),
    };
  }
}

export const documentEngine = new DocumentEngine();