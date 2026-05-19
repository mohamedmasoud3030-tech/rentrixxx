import { formatCompanyDate, formatCompanyMoney } from '@/lib/companyFormatters';
import type { CompanySettingsContract } from '@/lib/companySettings';
import type { Contract, Expense, Invoice, Person, Property, Unit } from '@/types/domain';
import { TableGenerator } from './TableGenerator';
import type { DocumentRequest, UnifiedDocumentModel } from './types';

type DocumentDbContext = {
  settings: CompanySettingsContract;
  contracts: Pick<Contract, 'id' | 'tenant_id' | 'unit_id' | 'property_id' | 'status' | 'start_date' | 'end_date' | 'rent_amount'>[];
  people: Pick<Person, 'id' | 'full_name'>[];
  units: Pick<Unit, 'id' | 'property_id' | 'unit_number'>[];
  properties: Pick<Property, 'id' | 'title'>[];
};

const toDate = (settings: CompanySettingsContract, value: string) => formatCompanyDate(settings, value);
const toMoney = (settings: CompanySettingsContract, value: number | null | undefined) => formatCompanyMoney(settings, value ?? 0);
const baseHeader = (settings: CompanySettingsContract, title: string, dateValue?: string, documentNo?: string) => ({ companyName: settings.companyName, title, documentNo, dateLabel: 'Date', dateValue, currency: settings.defaultCurrency });

class DocumentEngine {
  build(request: DocumentRequest): UnifiedDocumentModel {
    switch (request.type) {
      case 'invoice': return this.buildInvoice(request.payload as { invoice: Invoice; db: DocumentDbContext });
      case 'contract': return this.buildContract(request.payload as { contract: Contract; db: DocumentDbContext });
      case 'expense_voucher': return this.buildExpense(request.payload as { expense: Expense; settings: CompanySettingsContract });
      default: throw new Error(`Unsupported document type: ${request.type}`);
    }
  }

  private buildInvoice({ invoice, db }: { invoice: Invoice; db: DocumentDbContext }): UnifiedDocumentModel {
    const contract = db.contracts.find((c) => c.id === invoice.contract_id);
    const tenant = contract ? db.people.find((p) => p.id === contract.tenant_id) : null;
    const unit = contract?.unit_id ? db.units.find((u) => u.id === contract.unit_id) : null;
    const property = contract ? db.properties.find((p) => p.id === contract.property_id) : null;
    const total = invoice.amount || 0;
    const remaining = Math.max(0, total - (invoice.paid_amount || 0));
    return {
      type: 'invoice',
      header: baseHeader(db.settings, 'Invoice', toDate(db.settings, invoice.due_date), invoice.id),
      kpis: [
        { label: 'Tenant', value: tenant?.full_name || '-' },
        { label: 'Unit', value: `${property?.title || '-'} / ${unit?.unit_number || '-'}` },
        { label: 'Status', value: invoice.status || '-' },
      ],
      tables: [TableGenerator.build(['Description', 'Amount'], [['Amount', toMoney(db.settings, invoice.amount)], ['Paid', toMoney(db.settings, invoice.paid_amount)], ['Remaining', toMoney(db.settings, remaining)]], ['Total', toMoney(db.settings, total)])],
      footer: { signatures: ['tenant', 'accountant', 'general_manager'], companyStampLabel: 'Company Stamp' },
      fileName: `invoice_${invoice.id}`,
    };
  }

  private buildContract({ contract, db }: { contract: Contract; db: DocumentDbContext }): UnifiedDocumentModel {
    const tenant = db.people.find((p) => p.id === contract.tenant_id);
    const unit = contract.unit_id ? db.units.find((u) => u.id === contract.unit_id) : null;
    const property = db.properties.find((p) => p.id === contract.property_id);
    return { type: 'contract', header: baseHeader(db.settings, 'Contract', toDate(db.settings, contract.start_date), contract.id), kpis: [{ label: 'Tenant', value: tenant?.full_name || '-' }, { label: 'Unit', value: `${property?.title || '-'} / ${unit?.unit_number || '-'}` }, { label: 'Status', value: contract.status || '-' }], tables: [TableGenerator.build(['Field', 'Value'], [['Start', toDate(db.settings, contract.start_date)], ['End', toDate(db.settings, contract.end_date)], ['Rent', toMoney(db.settings, contract.rent_amount)]])], footer: { signatures: ['owner', 'tenant', 'accountant', 'general_manager'], companyStampLabel: 'Company Stamp' }, fileName: `contract_${contract.id}` };
  }

  private buildExpense({ expense, settings }: { expense: Expense; settings: CompanySettingsContract }): UnifiedDocumentModel {
    return { type: 'expense_voucher', header: baseHeader(settings, 'Expense Voucher', toDate(settings, expense.expense_date), expense.id), kpis: [{ label: 'Category', value: expense.category || '-' }], tables: [TableGenerator.build(['Field', 'Value'], [['Amount', toMoney(settings, expense.amount)], ['Description', expense.description || '-']])], footer: { signatures: ['accountant', 'general_manager'], companyStampLabel: 'Company Stamp' }, fileName: `expense_${expense.id}` };
  }
}

export const documentEngine = new DocumentEngine();
export type { DocumentDbContext };
