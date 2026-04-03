import type { Contract, Invoice, Settings } from '../types';
import { getEffectiveInvoiceStatus, getInvoiceRemaining } from '../utils/helpers';

const ROUND_SCALE = 3;

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const round3 = (value: number): number => Number(value.toFixed(ROUND_SCALE));

export const deriveInvoiceStatus = (invoice: Invoice, settings: Settings | null): Invoice['status'] => {
  const graceDays = settings?.operational?.lateFee?.graceDays ?? 0;
  return getEffectiveInvoiceStatus(invoice, graceDays) as Invoice['status'];
};

export const getInvoiceOutstanding = (invoice: Invoice): number => round3(getInvoiceRemaining(invoice));

export const computeLateFeeAmount = (
  rentAmount: number,
  lateFee: Settings['operational']['lateFee'],
): number => {
  if (!lateFee.isEnabled) return 0;
  if (lateFee.type === 'FIXED_AMOUNT') return round3(Math.max(0, lateFee.value));
  return round3(Math.max(0, (toNumber(rentAmount) * lateFee.value) / 100));
};

export const deriveArrearsForContract = (invoices: Invoice[], contractId: string): number => {
  return round3(
    invoices
      .filter(invoice => invoice.contractId === contractId)
      .reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0),
  );
};

export const deriveArrearsForOwner = (
  contracts: Contract[],
  invoices: Invoice[],
  ownerContractIds: string[],
): number => {
  const contractSet = new Set(ownerContractIds.length ? ownerContractIds : contracts.map(contract => contract.id));
  return round3(
    invoices
      .filter(invoice => contractSet.has(invoice.contractId))
      .reduce((sum, invoice) => sum + getInvoiceOutstanding(invoice), 0),
  );
};

export const applyBalanceRule = (balance: number, min = 0): number => {
  const rounded = round3(balance);
  return rounded < min ? min : rounded;
};
