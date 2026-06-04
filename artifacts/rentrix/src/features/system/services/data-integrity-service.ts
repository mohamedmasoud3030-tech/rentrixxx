import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { DataIntegrityCheck, DataIntegrityResult } from '../types';

type PropertyRow = Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'deleted_at'>;
type UnitRow = Pick<Database['public']['Tables']['units']['Row'], 'id' | 'property_id' | 'deleted_at'>;
type PersonRow = Pick<Database['public']['Tables']['people']['Row'], 'id' | 'deleted_at'>;
type ContractRow = Pick<Database['public']['Tables']['contracts']['Row'], 'id' | 'property_id' | 'unit_id' | 'tenant_id' | 'start_date' | 'end_date' | 'deleted_at'>;
type InvoiceRow = Pick<Database['public']['Tables']['invoices']['Row'], 'id' | 'contract_id' | 'amount' | 'paid_amount' | 'deleted_at'>;

const INTEGRITY_UNAVAILABLE_REASON = 'تعذر تشغيل فحص سلامة البيانات باستخدام مخطط التشغيل الحالي دون افتراضات إضافية.';

function activeIds<T extends { id: string; deleted_at: string | null }>(rows: readonly T[]): Set<string> {
  return new Set(rows.filter((row) => !row.deleted_at).map((row) => row.id));
}

function buildCheck(id: string, label: string, description: string, count: number): DataIntegrityCheck {
  return { id, label, description, count, severity: count > 0 ? 'warning' : 'ok' };
}

export function buildDataIntegritySnapshot(input: Readonly<{
  properties: readonly PropertyRow[];
  units: readonly UnitRow[];
  people: readonly PersonRow[];
  contracts: readonly ContractRow[];
  invoices: readonly InvoiceRow[];
}>): DataIntegrityResult {
  const propertyIds = activeIds(input.properties);
  const unitIds = activeIds(input.units);
  const peopleIds = activeIds(input.people);
  const contractIds = activeIds(input.contracts);

  const orphanUnits = input.units.filter((unit) => !unit.deleted_at && !propertyIds.has(unit.property_id)).length;
  const orphanContracts = input.contracts.filter((contract) => !contract.deleted_at && (!propertyIds.has(contract.property_id) || !peopleIds.has(contract.tenant_id))).length;
  const contractsWithMissingUnits = input.contracts.filter((contract) => !contract.deleted_at && contract.unit_id && !unitIds.has(contract.unit_id)).length;
  const contractsWithInvalidDates = input.contracts.filter((contract) => !contract.deleted_at && new Date(contract.start_date).getTime() > new Date(contract.end_date).getTime()).length;
  const orphanInvoices = input.invoices.filter((invoice) => !invoice.deleted_at && !contractIds.has(invoice.contract_id)).length;
  const overpaidInvoices = input.invoices.filter((invoice) => !invoice.deleted_at && Number(invoice.paid_amount) > Number(invoice.amount)).length;

  return {
    status: 'available',
    snapshot: {
      checkedAt: new Date().toISOString(),
      checks: [
        buildCheck('orphan-units', 'وحدات بلا عقار نشط', 'الوحدات النشطة يجب أن ترتبط بعقار نشط.', orphanUnits),
        buildCheck('orphan-contracts', 'عقود بلا عقار أو مستأجر نشط', 'العقود النشطة يجب أن ترتبط بعقار ومستأجر نشطين.', orphanContracts),
        buildCheck('missing-contract-units', 'عقود بوحدات غير متاحة', 'عند تحديد وحدة في العقد يجب أن تكون الوحدة موجودة ونشطة.', contractsWithMissingUnits),
        buildCheck('invalid-contract-dates', 'عقود بتواريخ غير منطقية', 'تاريخ بداية العقد يجب ألا يتجاوز تاريخ نهايته.', contractsWithInvalidDates),
        buildCheck('orphan-invoices', 'فواتير بلا عقد نشط', 'الفواتير النشطة يجب أن ترتبط بعقد نشط.', orphanInvoices),
        buildCheck('overpaid-invoices', 'فواتير مدفوعة بأكثر من قيمتها', 'المبلغ المدفوع لا يجب أن يتجاوز قيمة الفاتورة.', overpaidInvoices),
      ],
    },
  };
}

export async function runDataIntegrityAudit(): Promise<DataIntegrityResult> {
  const [properties, units, people, contracts, invoices] = await Promise.all([
    supabase.from('properties').select('id, deleted_at'),
    supabase.from('units').select('id, property_id, deleted_at'),
    supabase.from('people').select('id, deleted_at'),
    supabase.from('contracts').select('id, property_id, unit_id, tenant_id, start_date, end_date, deleted_at'),
    supabase.from('invoices').select('id, contract_id, amount, paid_amount, deleted_at'),
  ]);

  if (properties.error || units.error || people.error || contracts.error || invoices.error) {
    return { status: 'unavailable', reason: INTEGRITY_UNAVAILABLE_REASON };
  }

  return buildDataIntegritySnapshot({
    properties: properties.data ?? [],
    units: units.data ?? [],
    people: people.data ?? [],
    contracts: contracts.data ?? [],
    invoices: invoices.data ?? [],
  });
}

