import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { DataIntegrityCheck, DataIntegrityResult } from '../types';

type PropertyRow = Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'deleted_at'>;
type UnitRow = Pick<Database['public']['Tables']['units']['Row'], 'id' | 'property_id' | 'deleted_at'>;
type PersonRow = Pick<Database['public']['Tables']['people']['Row'], 'id' | 'type' | 'deleted_at'>;
type ContractRow = Pick<Database['public']['Tables']['contracts']['Row'], 'id' | 'property_id' | 'unit_id' | 'tenant_id' | 'start_date' | 'end_date' | 'deleted_at'>;
type InvoiceRow = Pick<Database['public']['Tables']['invoices']['Row'], 'id' | 'contract_id' | 'amount' | 'paid_amount' | 'deleted_at'>;

const INTEGRITY_UNAVAILABLE_REASON = 'تعذر تشغيل فحص سلامة البيانات باستخدام مخطط التشغيل الحالي دون افتراضات إضافية.';
const INTEGRITY_BROWSER_LIMIT_REASON = 'وصل فحص سلامة البيانات إلى حد القراءة الآمن في المتصفح قبل تأكيد اكتمال البيانات. هذا الفحص مناسب لبيانات العرض أو التدريج فقط، ويحتاج الإنتاج إلى مسار قراءة خادمي قابل للتوسع ومتحقق منه.';
export const DATA_INTEGRITY_PAGE_SIZE = 500;
export const DATA_INTEGRITY_MAX_PAGES = 10;

type PaginatedReadQuery<Row> = Readonly<{
  range: (from: number, to: number) => PromiseLike<{ data: readonly Row[] | null; error: unknown }>;
}>;

type PaginatedReadResult<Row> =
  | Readonly<{ status: 'available'; rows: readonly Row[] }>
  | Readonly<{ status: 'unavailable'; reason: string }>;

function activeIds<T extends { id: string; deleted_at: string | null }>(rows: readonly T[]): Set<string> {
  return new Set(rows.filter((row) => !row.deleted_at).map((row) => row.id));
}

function activeTenantIds(rows: readonly PersonRow[]): Set<string> {
  return new Set(rows.filter((person) => !person.deleted_at && person.type === 'tenant').map((person) => person.id));
}

function activeUnitPropertyById(rows: readonly UnitRow[]): Map<string, string> {
  return new Map(rows.filter((unit) => !unit.deleted_at).map((unit) => [unit.id, unit.property_id]));
}

function buildCheck(id: string, label: string, description: string, count: number): DataIntegrityCheck {
  return { id, label, description, count, severity: count > 0 ? 'warning' : 'ok' };
}

export async function fetchPaginatedRows<Row>(createQuery: () => PaginatedReadQuery<Row>): Promise<PaginatedReadResult<Row>> {
  const rows: Row[] = [];

  for (let pageIndex = 0; pageIndex < DATA_INTEGRITY_MAX_PAGES; pageIndex += 1) {
    const from = pageIndex * DATA_INTEGRITY_PAGE_SIZE;
    const to = from + DATA_INTEGRITY_PAGE_SIZE - 1;
    const { data, error } = await createQuery().range(from, to);

    if (error) return { status: 'unavailable', reason: INTEGRITY_UNAVAILABLE_REASON };

    const page = data ?? [];
    rows.push(...page);

    if (page.length < DATA_INTEGRITY_PAGE_SIZE) {
      return { status: 'available', rows };
    }
  }

  return { status: 'unavailable', reason: INTEGRITY_BROWSER_LIMIT_REASON };
}

export function buildDataIntegritySnapshot(input: Readonly<{
  properties: readonly PropertyRow[];
  units: readonly UnitRow[];
  people: readonly PersonRow[];
  contracts: readonly ContractRow[];
  invoices: readonly InvoiceRow[];
}>): DataIntegrityResult {
  const propertyIds = activeIds(input.properties);
  const unitPropertyById = activeUnitPropertyById(input.units);
  const tenantIds = activeTenantIds(input.people);
  const contractIds = activeIds(input.contracts);

  const orphanUnits = input.units.filter((unit) => !unit.deleted_at && !propertyIds.has(unit.property_id)).length;
  const orphanContracts = input.contracts.filter((contract) => !contract.deleted_at && (!propertyIds.has(contract.property_id) || !tenantIds.has(contract.tenant_id))).length;
  const contractsWithInvalidUnits = input.contracts.filter((contract) => {
    if (contract.deleted_at || !contract.unit_id) return false;

    return unitPropertyById.get(contract.unit_id) !== contract.property_id;
  }).length;
  const contractsWithInvalidDates = input.contracts.filter((contract) => !contract.deleted_at && new Date(contract.start_date).getTime() > new Date(contract.end_date).getTime()).length;
  const orphanInvoices = input.invoices.filter((invoice) => !invoice.deleted_at && !contractIds.has(invoice.contract_id)).length;
  const overpaidInvoices = input.invoices.filter((invoice) => !invoice.deleted_at && Number(invoice.paid_amount) > Number(invoice.amount)).length;

  return {
    status: 'available',
    snapshot: {
      checkedAt: new Date().toISOString(),
      checks: [
        buildCheck('orphan-units', 'وحدات بلا عقار نشط', 'الوحدات النشطة يجب أن ترتبط بعقار نشط.', orphanUnits),
        buildCheck('orphan-contracts', 'عقود بلا عقار أو مستأجر نشط', 'العقود النشطة يجب أن ترتبط بعقار نشط وبشخص نشط من نوع مستأجر.', orphanContracts),
        buildCheck('invalid-contract-units', 'عقود بوحدات غير مطابقة للعقار', 'عند تحديد وحدة في العقد يجب أن تكون الوحدة نشطة وتابعة للعقار نفسه في العقد.', contractsWithInvalidUnits),
        buildCheck('invalid-contract-dates', 'عقود بتواريخ غير منطقية', 'تاريخ بداية العقد يجب ألا يتجاوز تاريخ نهايته.', contractsWithInvalidDates),
        buildCheck('orphan-invoices', 'فواتير بلا عقد نشط', 'الفواتير النشطة يجب أن ترتبط بعقد نشط.', orphanInvoices),
        buildCheck('overpaid-invoices', 'فواتير مدفوعة بأكثر من قيمتها', 'المبلغ المدفوع لا يجب أن يتجاوز قيمة الفاتورة.', overpaidInvoices),
      ],
    },
  };
}

export async function runDataIntegrityAudit(): Promise<DataIntegrityResult> {
  const [properties, units, people, contracts, invoices] = await Promise.all([
    fetchPaginatedRows<PropertyRow>(() => supabase.from('properties').select('id, deleted_at').order('id', { ascending: true })),
    fetchPaginatedRows<UnitRow>(() => supabase.from('units').select('id, property_id, deleted_at').order('id', { ascending: true })),
    fetchPaginatedRows<PersonRow>(() => supabase.from('people').select('id, type, deleted_at').order('id', { ascending: true })),
    fetchPaginatedRows<ContractRow>(() => supabase.from('contracts').select('id, property_id, unit_id, tenant_id, start_date, end_date, deleted_at').order('id', { ascending: true })),
    fetchPaginatedRows<InvoiceRow>(() => supabase.from('invoices').select('id, contract_id, amount, paid_amount, deleted_at').order('id', { ascending: true })),
  ]);

  if (properties.status === 'unavailable') return properties;
  if (units.status === 'unavailable') return units;
  if (people.status === 'unavailable') return people;
  if (contracts.status === 'unavailable') return contracts;
  if (invoices.status === 'unavailable') return invoices;

  return buildDataIntegritySnapshot({
    properties: properties.rows,
    units: units.rows,
    people: people.rows,
    contracts: contracts.rows,
    invoices: invoices.rows,
  });
}
