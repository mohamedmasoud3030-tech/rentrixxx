import type { CompanySettingsContract } from '@/lib/companySettings';
import type { Contract, Expense, Invoice, Person, Property, Unit } from '@/types/domain';
import { DocumentController } from './documents/DocumentController';
import type { DocumentDbContext } from './documents/DocumentEngine';

type PdfContextInput = {
  settings: CompanySettingsContract;
  contracts: DocumentDbContext['contracts'];
  people: Pick<Person, 'id' | 'full_name'>[];
  units: Pick<Unit, 'id' | 'property_id' | 'unit_number'>[];
  properties: Pick<Property, 'id' | 'title'>[];
};

function toDbContext(input: PdfContextInput): DocumentDbContext {
  return { settings: input.settings, contracts: input.contracts, people: input.people, units: input.units, properties: input.properties };
}

export function exportInvoiceToPdf(invoice: Invoice, context: PdfContextInput): void {
  void DocumentController.renderToPDF({ type: 'invoice', payload: { invoice, db: toDbContext(context) } });
}

export function exportContractToPdf(contract: Contract, context: PdfContextInput): void {
  void DocumentController.renderToPDF({ type: 'contract', payload: { contract, db: toDbContext(context) } });
}

export function exportExpenseToPdf(expense: Expense, settings: CompanySettingsContract): void {
  void DocumentController.renderToPDF({ type: 'expense_voucher', payload: { expense, settings } });
}
