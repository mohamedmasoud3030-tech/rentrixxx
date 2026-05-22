import { supabase } from '@/integrations/supabase/client';
import { getPaginationRange } from '@/lib/pagination';
import type { Database } from '@/types/database';
import type { Contract, Person, Property, Unit } from '@/types/domain';
import type { ContractPayload, RenewalPayload } from '../contractSchema';

export type ContractStatusFilter = Contract['status'] | 'all';
export type ContractListItem = Contract & {
  properties: Pick<Property, 'id' | 'title' | 'address'> | null;
  units: Pick<Unit, 'id' | 'unit_number' | 'floor' | 'status' | 'rent_amount'> | null;
  people: Pick<Person, 'id' | 'full_name' | 'phone' | 'email' | 'national_id'> | null;
};
export type ContractDetail = ContractListItem & {
  renewed_from: Pick<Contract, 'id' | 'start_date' | 'end_date' | 'rent_amount' | 'status'> | null;
};

export type ContractListParams = { status: ContractStatusFilter; page?: number; pageSize?: number };
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

const contractSelect =
  '*, properties:property_id(id,title,address), units:unit_id(id,unit_number,floor,status,rent_amount), people:tenant_id(id,full_name,phone,email,national_id)';
const contractDetailSelect =
  '*, properties:property_id(id,title,address), units:unit_id(id,unit_number,floor,status,rent_amount), people:tenant_id(id,full_name,phone,email,national_id), renewed_from:renewed_from_id(id,start_date,end_date,rent_amount,status)';

export async function listContracts(params: ContractListParams): Promise<ContractListItem[]> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const { from, to } = getPaginationRange(page, pageSize);

  let query = supabase
    .from('contracts')
    .select(contractSelect, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (params.status !== 'all') query = query.eq('status', params.status);
  const { data, error } = await query.returns<ContractListItem[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getContract(contractId: string): Promise<ContractDetail> {
  const { data, error } = await supabase.from('contracts').select(contractDetailSelect).eq('id', contractId).is('deleted_at', null).single().returns<ContractDetail>();
  if (error) throw error;
  return data;
}

export async function createContract(payload: ContractPayload): Promise<Contract> {
  const insertPayload: ContractInsert = { ...payload, unit_id: payload.unit_id ?? null };
  const { data, error } = await supabase.from('contracts').insert(insertPayload).select('*').single().returns<Contract>();
  if (error) throw error;
  return data;
}

export async function updateContract(contractId: string, payload: ContractPayload): Promise<Contract> {
  const updatePayload: ContractUpdate = { ...payload, unit_id: payload.unit_id ?? null };
  const { data, error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId).is('deleted_at', null).select('*').single().returns<Contract>();
  if (error) throw error;
  return data;
}

export async function softDeleteContract(contractId: string): Promise<void> {
  const updatePayload: ContractUpdate = { deleted_at: new Date().toISOString() };
  const { error } = await supabase.from('contracts').update(updatePayload).eq('id', contractId).is('deleted_at', null);
  if (error) throw error;
}

export async function renewContract(contractId: string, payload: RenewalPayload): Promise<string> {
  const { data, error } = await supabase.rpc('renew_contract_atomic', { contract_id: contractId, ...payload }).returns<string>();
  if (error) throw error;
  return data;
}
