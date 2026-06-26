import { supabase } from '@/lib/supabase';
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

export type ContractListParams = { status: ContractStatusFilter };
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];
export type RenewalResult = { status: 'renewed'; old_contract_id: string; new_contract_id: string };

const contractSelect =
  '*, properties:property_id(id,title,address), units:unit_id(id,unit_number,floor,status,rent_amount), people:tenant_id(id,full_name,phone,email,national_id)';
const contractDetailSelect =
  '*, properties:property_id(id,title,address), units:unit_id(id,unit_number,floor,status,rent_amount), people:tenant_id(id,full_name,phone,email,national_id), renewed_from:renewed_from_id(id,start_date,end_date,rent_amount,status)';

export async function listContracts(params: ContractListParams): Promise<ContractListItem[]> {
  let query = supabase.from('contracts').select(contractSelect).is('deleted_at', null).order('created_at', { ascending: false });
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

function parseRenewalResult(data: unknown): RenewalResult {
  if (!data || typeof data !== 'object') throw new Error('Renewal RPC returned an invalid response');
  const result = data as Partial<RenewalResult>;
  if (result.status !== 'renewed' || !result.old_contract_id || !result.new_contract_id) {
    throw new Error('Renewal RPC response is missing the new contract id');
  }
  return result as RenewalResult;
}

export async function renewContract(contractId: string, payload: RenewalPayload): Promise<RenewalResult> {
  const { data, error } = await supabase.rpc('renew_contract_atomic', {
    old_contract_id: contractId,
    new_contract_data: {
      new_start: payload.new_start,
      new_end: payload.new_end,
      new_amount: payload.new_amount,
    },
  });
  if (error) throw error;
  return parseRenewalResult(data);
}
