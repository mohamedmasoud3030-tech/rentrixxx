import { supabase } from '@/integrations/supabase/client';
import type { Contract, Invoice, Person, Property, Unit } from '@/types/domain';

export type TenantWorkspaceParams = {
  search: string;
  page: number;
  pageSize: number;
};

export type TenantWorkspaceRow = {
  person: Pick<Person, 'id' | 'full_name' | 'phone' | 'email' | 'national_id'>;
  activeContractCount: number;
  propertyTitle: string | null;
  unitNumber: string | null;
  primaryContractId: string | null;
  hasInvoices: boolean;
  hasArrears: boolean;
};

export type TenantWorkspaceResult = {
  rows: TenantWorkspaceRow[];
  count: number;
};

type TenantContract = Contract & {
  properties: Pick<Property, 'id' | 'title'> | null;
  units: Pick<Unit, 'id' | 'unit_number'> | null;
};

type TenantInvoice = Pick<Invoice, 'contract_id' | 'status' | 'amount' | 'paid_amount' | 'due_date'>;

const tenantContractSelect = '*, properties:property_id(id,title), units:unit_id(id,unit_number)';
const tenantInvoiceSelect = 'contract_id,status,amount,paid_amount,due_date';

function escapeSearchTerm(value: string) {
  return value.replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function applyTenantSearch(query: ReturnType<typeof supabase.from>, search: string) {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) return query;
  const term = `"%${escapeSearchTerm(trimmedSearch)}%"`;
  return query.or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},national_id.ilike.${term}`);
}

function getTenantIds(people: TenantWorkspaceRow['person'][]) {
  return people.map((person) => person.id);
}

function groupContractsByTenant(contracts: TenantContract[]) {
  return contracts.reduce<Record<string, TenantContract[]>>((grouped, contract) => {
    const current = grouped[contract.tenant_id] ?? [];
    grouped[contract.tenant_id] = [...current, contract];
    return grouped;
  }, {});
}

function getPrimaryContract(contracts: TenantContract[]) {
  return contracts.find((contract) => contract.status === 'active') ?? contracts[0] ?? null;
}

function isInvoiceInArrears(invoice: TenantInvoice, today: string) {
  const remainingAmount = invoice.amount - invoice.paid_amount;
  if (remainingAmount <= 0) return false;
  if (invoice.status === 'overdue') return true;
  return invoice.due_date < today && invoice.status !== 'paid' && invoice.status !== 'void';
}

function summarizeInvoices(invoices: TenantInvoice[], today: string) {
  return invoices.reduce(
    (summary, invoice) => ({
      hasInvoices: true,
      hasArrears: summary.hasArrears || isInvoiceInArrears(invoice, today),
    }),
    { hasInvoices: false, hasArrears: false },
  );
}

function buildTenantRow(person: TenantWorkspaceRow['person'], contracts: TenantContract[], invoices: TenantInvoice[], today: string): TenantWorkspaceRow {
  const primaryContract = getPrimaryContract(contracts);
  const invoiceSummary = summarizeInvoices(invoices, today);
  return {
    person,
    activeContractCount: contracts.filter((contract) => contract.status === 'active').length,
    propertyTitle: primaryContract?.properties?.title ?? null,
    unitNumber: primaryContract?.units?.unit_number ?? null,
    primaryContractId: primaryContract?.id ?? null,
    hasInvoices: invoiceSummary.hasInvoices,
    hasArrears: invoiceSummary.hasArrears,
  };
}

async function listTenantContracts(tenantIds: string[]) {
  if (tenantIds.length === 0) return [];
  const { data, error } = await supabase
    .from('contracts')
    .select(tenantContractSelect)
    .in('tenant_id', tenantIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<TenantContract[]>();
  if (error) throw error;
  return data ?? [];
}

async function listTenantInvoices(contractIds: string[]) {
  if (contractIds.length === 0) return [];
  const { data, error } = await supabase
    .from('invoices')
    .select(tenantInvoiceSelect)
    .in('contract_id', contractIds)
    .is('deleted_at', null)
    .returns<TenantInvoice[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listTenantWorkspace(params: TenantWorkspaceParams): Promise<TenantWorkspaceResult> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from('people')
    .select('id,full_name,phone,email,national_id', { count: 'exact' })
    .eq('type', 'tenant')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  query = applyTenantSearch(query, params.search);

  const { data: people, count, error } = await query.returns<TenantWorkspaceRow['person'][]>();
  if (error) throw error;

  const tenantPeople = people ?? [];
  const tenantIds = getTenantIds(tenantPeople);
  const contracts = await listTenantContracts(tenantIds);
  const contractsByTenant = groupContractsByTenant(contracts);
  const invoices = await listTenantInvoices(contracts.map((contract) => contract.id));
  const today = new Date().toISOString().slice(0, 10);

  return {
    rows: tenantPeople.map((person) => buildTenantRow(person, contractsByTenant[person.id] ?? [], invoices.filter((invoice) => contractsByTenant[person.id]?.some((contract) => contract.id === invoice.contract_id) ?? false), today)),
    count: count ?? 0,
  };
}
