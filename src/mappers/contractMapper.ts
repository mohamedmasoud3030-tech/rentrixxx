import type { Contract } from '../types';

type ContractPayloadInput = {
  unitId?: string;
  tenantId?: string;
  rent?: number;
  dueDay?: number;
  start?: string;
  end?: string;
  deposit?: number;
  status?: Contract['status'];
  sponsorName?: string;
  sponsorId?: string;
  sponsorPhone?: string;
  unit_id?: string;
  tenant_id?: string;
  rent_amount?: number;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  sponsor_name?: string;
  sponsor_id?: string;
  sponsor_phone?: string;
};

export function mapContractPayload(input: ContractPayloadInput) {
  return {
    unit_id: input.unit_id ?? input.unitId,
    tenant_id: input.tenant_id ?? input.tenantId,
    rent_amount: input.rent_amount ?? input.rent,
    due_day: input.due_day ?? input.dueDay,
    start_date: input.start_date ?? input.start,
    end_date: input.end_date ?? input.end,
    deposit: input.deposit,
    status: input.status,
    sponsor_name: input.sponsor_name ?? input.sponsorName,
    sponsor_id: input.sponsor_id ?? input.sponsorId,
    sponsor_phone: input.sponsor_phone ?? input.sponsorPhone,
  };
}
