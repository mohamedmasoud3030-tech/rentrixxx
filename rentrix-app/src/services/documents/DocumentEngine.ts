import type { Contract, Expense, Invoice, Person, Property, Receipt, Unit } from '@/types/domain';
import { TableGenerator } from './TableGenerator';
import type { DocumentRequest, SignatureRole, UnifiedDocumentModel } from './types';

type Settings = { general?: { company?: { name?: string; address?: string; phone?: string } }; operational?: { currency?: string } };
type AppLikeDb = { settings: Settings; contracts: Contract[]; tenants: Person[]; units: Unit[]; properties: Property[]; receipts?: Receipt[] };

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
  dateLabel: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e',
  dateValue,
  currency: currencyOf(s),
});

const formatDocumentValue = (value: unknown): string => {
  if (value == null) return '\u2014';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '\u2014' : value.toLocaleDateString('en-GB');
  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '\u2014';
    }
  }
  return '\u2014';
};

const kpi = (label: string, value: unknown) => ({ label, value: formatDocumentValue(value) });
const footer = (signatures: SignatureRole[]) => ({ signatures, companyStampLabel: '\u062e\u062a\u0645 \u0627\u0644\u0634\u0631\u0643\u0629' });
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
      header: baseHeader(db.settings, '\u0641\u0627\u062a\u0648\u0631\u0629', fmtDate(invoice.due_date), invoice.id.slice(0, 8)),
      kpis: [
        kpi('\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631', tenant?.full_name),
        kpi('\u0627\u0644\u0648\u062d\u062f\u0629', `${property?.title || '-'} / ${unit?.unit_number || '-'}`),
        kpi('\u0627\u0644\u062d\u0627\u0644\u0629', invoice.status),
      ],
      tables: [
        TableGenerator.build(
          ['\u0627\u0644\u0648\u0635\u0641', '\u0627\u0644\u0645\u0628\u0644\u063a'],
          [
            ['\u0642\u064a\u0645\u0629 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629', toMoney(invoice.amount || 0, db.settings)],
            ['\u0627\u0644\u0636\u0631\u064a\u0628\u0629', toMoney(0, db.settings)],
            ['\u0627\u0644\u0645\u062f\u0641\u0648\u0639', toMoney(paid, db.settings)],
            ['\u0627\u0644\u0645\u062a\u0628\u0642\u064a', toMoney(remaining, db.settings)],
          ],
          ['\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a', toMoney(total, db.settings)],
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
      header: baseHeader(db.settings, '\u0639\u0642\u062f \u0625\u064a\u062c\u0627\u0631', fmtDate(contract.start_date), contract.id.slice(0, 8)),
      kpis: [
        kpi('\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631', tenant?.full_name),
        kpi('\u0627\u0644\u0648\u062d\u062f\u0629', `${property?.title || '-'} / ${unit?.unit_number || '-'}`),
        kpi('\u0627\u0644\u062d\u0627\u0644\u0629', contract.status),
      ],
      tables: [
        TableGenerator.build(
          ['\u0627\u0644\u062d\u0642\u0644', '\u0627\u0644\u0642\u064a\u0645\u0629'],
          [
            ['\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629', fmtDate(contract.start_date)],
            ['\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629', fmtDate(contract.end_date)],
            ['\u0642\u064a\u0645\u0629 \u0627\u0644\u0625\u064a\u062c\u0627\u0631', toMoney(contract.rent_amount || 0, db.settings)],
            ['\u0627\u0644\u062a\u0623\u0645\u064a\u0646', toMoney(0, db.settings)],
            ['\u062f\u0648\u0631\u0629 \u0627\u0644\u0633\u062f\u0627\u062f', String(contract.payment_cycle || '-')],
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
      header: baseHeader(db.settings, '\u0625\u064a\u0635\u0627\u0644 \u0627\u0633\u062a\u0642\u0628\u0627\u0644', fmtDate(receipt.payment_date), receipt.id.slice(0, 8)),
      kpis: [
        kpi('\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631', tenant?.full_name || 'N/A'),
        kpi('\u0627\u0644\u0648\u062d\u062f\u0629', property ? `${property.title} / ${unit?.unit_number || '-'}` : 'N/A'),
        kpi('\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639', receipt.payment_method),
      ],
      tables: [
        TableGenerator.build(
          ['\u0627\u0644\u062d\u0642\u0644', '\u0627\u0644\u0642\u064a\u0645\u0629'],
          [
            ['\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u0642\u0628\u0644', toMoney(receipt.amount || 0, db.settings)],
            ['\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639', receipt.payment_method],
            ['\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062c\u0639', receipt.reference_number || '-'],
            ['\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a', receipt.notes || '-'],
          ],
          ['\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a', toMoney(receipt.amount || 0, db.settings)],
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
      header: baseHeader(db.settings, '\u0633\u0646\u062f \u0645\u0635\u0631\u0648\u0641', fmtDateTime(expense.expense_date), expense.id.slice(0, 8)),
      kpis: [
        kpi('\u0627\u0644\u062a\u0635\u0646\u064a\u0641', expense.category),
        kpi('\u0627\u0644\u0639\u0642\u0627\u0631', property?.title),
        kpi('\u0627\u0644\u062d\u0627\u0644\u0629', '-'),
      ],
      tables: [
        TableGenerator.build(
          ['\u0627\u0644\u062d\u0642\u0644', '\u0627\u0644\u0642\u064a\u0645\u0629'],
          [
            ['\u0627\u0644\u0645\u0628\u0644\u063a', toMoney(expense.amount || 0, db.settings)],
            ['\u0627\u0644\u0636\u0631\u064a\u0628\u0629', toMoney(0, db.settings)],
            ['\u0627\u0644\u0645\u0631\u062c\u0639', '-'],
            ['\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a', expense.description || '-'],
          ],
        ),
      ],
      footer: footer(['accountant', 'general_manager']),
      fileName: fileName('expense', expense.id.slice(0, 8), expense.id),
    };
  }
}

export const documentEngine = new DocumentEngine();
