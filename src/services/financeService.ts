import type { Contract, Invoice, Settings } from '../types';
import { getEffectiveInvoiceStatus, getInvoiceRemaining } from '../utils/helpers';

const ROUND_SCALE = 3;

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const round3 = (value: number): number => Number(value.toFixed(ROUND_SCALE));

// ROUNDING STANDARD FOR RENTRIX:
// All intermediate calculations use full precision (no rounding).
// Round ONLY at the final display/storage step.
// VAT is always calculated on the net amount, then rounded once.
// Allocations: sum of parts must exactly equal the whole
//   (use largest-remainder method for the last allocation).
export function calcVAT(
  netAmount: number,
  vatRate: number,
): { net: number; vat: number; gross: number } {
  const vat = Math.round((netAmount * vatRate / 100) * 1000) / 1000;
  return {
    net: netAmount,
    vat,
    gross: Math.round((netAmount + vat) * 1000) / 1000,
  };
}

export function distributeAmount(
  total: number,
  parts: number[],
): number[] {
  if (!Number.isFinite(total) || total <= 0 || parts.length === 0) return parts.map(() => 0);

  const scale = 1000;
  const safeParts = parts.map(p => (Number.isFinite(p) && p > 0 ? p : 0));
  const sumParts = safeParts.reduce((a, b) => a + b, 0);
  if (sumParts <= 0) return parts.map(() => 0);

  const scaledTotal = Math.round(total * scale);
  const rawScaled = safeParts.map(p => (p / sumParts) * scaledTotal);
  const floors = rawScaled.map(Math.floor);
  let remainderUnits = scaledTotal - floors.reduce((a, b) => a + b, 0);

  const rankedIndices = rawScaled
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .map(item => item.index);

  let cursor = 0;
  while (remainderUnits > 0) {
    floors[rankedIndices[cursor % rankedIndices.length]] += 1;
    remainderUnits -= 1;
    cursor += 1;
  }

  return floors.map(value => value / scale);
}

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

export interface InvoiceAgingBucket {
  count: number;
  totalAmount: number;
}

export interface InvoiceAgingSummary {
  current: InvoiceAgingBucket;
  overdue_1_30: InvoiceAgingBucket;
  overdue_31_60: InvoiceAgingBucket;
  overdue_61_90: InvoiceAgingBucket;
  overdue_90_plus: InvoiceAgingBucket;
}

export const getInvoiceAgingSummary = (invoices: Invoice[]): InvoiceAgingSummary => {
  const summary: InvoiceAgingSummary = {
    current: { count: 0, totalAmount: 0 },
    overdue_1_30: { count: 0, totalAmount: 0 },
    overdue_31_60: { count: 0, totalAmount: 0 },
    overdue_61_90: { count: 0, totalAmount: 0 },
    overdue_90_plus: { count: 0, totalAmount: 0 },
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  invoices.forEach((invoice) => {
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
    const totalAmount = round3((invoice.amount || 0) + (invoice.taxAmount || 0));

    if (overdueDays <= 0) {
      summary.current.count += 1;
      summary.current.totalAmount = round3(summary.current.totalAmount + totalAmount);
      return;
    }

    if (overdueDays <= 30) {
      summary.overdue_1_30.count += 1;
      summary.overdue_1_30.totalAmount = round3(summary.overdue_1_30.totalAmount + totalAmount);
      return;
    }

    if (overdueDays <= 60) {
      summary.overdue_31_60.count += 1;
      summary.overdue_31_60.totalAmount = round3(summary.overdue_31_60.totalAmount + totalAmount);
      return;
    }

    if (overdueDays <= 90) {
      summary.overdue_61_90.count += 1;
      summary.overdue_61_90.totalAmount = round3(summary.overdue_61_90.totalAmount + totalAmount);
      return;
    }

    summary.overdue_90_plus.count += 1;
    summary.overdue_90_plus.totalAmount = round3(summary.overdue_90_plus.totalAmount + totalAmount);
  });

  return summary;
};
