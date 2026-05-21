import type { RenewalPayload } from '../contractSchema';
import type { ContractDetail } from '../services/contractService';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): Date {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function addYear(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + 1);
  nextDate.setDate(nextDate.getDate() - 1);
  return nextDate;
}

export function getRenewalDefaults(contract: ContractDetail): RenewalPayload {
  const nextStart = addDays(contract.end_date, 1);
  return {
    new_start: toDateInputValue(nextStart),
    new_end: toDateInputValue(addYear(nextStart)),
    new_amount: contract.rent_amount,
  };
}

export function canRenewContract(contract: ContractDetail): boolean {
  return contract.status === 'active' || contract.status === 'expired';
}
