import type { Contract } from '../types';

export type ContractPayloadInput = {
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
};

export type ContractDbPayload = {
  unit_id?: string;
  tenant_id?: string;
  rent_amount?: number;
  due_day?: number;
  start_date?: string;
  end_date?: string;
  deposit?: number;
  status?: Contract['status'];
  sponsor_name?: string;
  sponsor_id?: string;
  sponsor_phone?: string;
};

export function mapContractPayload(input: ContractPayloadInput): ContractDbPayload {
  return {
    unit_id: input.unitId,
    tenant_id: input.tenantId,
    rent_amount: input.rent,
    due_day: input.dueDay,
    start_date: input.start,
    end_date: input.end,
    deposit: input.deposit,
    status: input.status,
    sponsor_name: input.sponsorName,
    sponsor_id: input.sponsorId,
    sponsor_phone: input.sponsorPhone,
  };
}
